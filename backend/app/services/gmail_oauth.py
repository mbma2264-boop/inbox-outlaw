from __future__ import annotations

import base64
import json
import re
import secrets
import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings
from app.schemas import ClassificationResult, EmailInput, GmailConnectionStatus, GmailSyncedMessage
from app.services.classifier import classify_email

GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"
STATE_TTL_MINUTES = 15
LINK_RE = re.compile(r"https?://[^\s<>'\")]+", re.IGNORECASE)


@dataclass
class OAuthStateRecord:
    return_to: str
    created_at: str
    user_email: str


class GmailOAuthError(RuntimeError):
    pass


class GmailNotConnectedError(GmailOAuthError):
    pass


def _build_fernet() -> Fernet:
    raw = get_settings().token_encryption_key.encode("utf-8")
    digest = hashlib.sha256(raw).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def _encrypt_value(value: str | None) -> str | None:
    if not value:
        return None
    return _build_fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def _decrypt_value(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return _build_fernet().decrypt(value.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        if value and not str(value).startswith("gAAAA"):
            return str(value)
        raise GmailOAuthError("Stored Gmail token data could not be decrypted. Check TOKEN_ENCRYPTION_KEY.")


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _settings_store_path() -> Path:
    settings = get_settings()
    path = settings.gmail_token_store
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[2] / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _default_store() -> dict[str, Any]:
    return {"oauth_states": {}, "users": {}}


def _load_store() -> dict[str, Any]:
    path = _settings_store_path()
    if not path.exists():
        return _default_store()

    try:
        store = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return _default_store()

    if "users" not in store:
        tokens = store.get("tokens") or {}
        store = _default_store()
        if tokens:
            store["users"]["legacy@local.demo"] = {"tokens": tokens}
    return store


def _save_store(store: dict[str, Any]) -> None:
    path = _settings_store_path()
    path.write_text(json.dumps(store, indent=2, sort_keys=True), encoding="utf-8")


def _prune_states(store: dict[str, Any]) -> None:
    cutoff = _utcnow() - timedelta(minutes=STATE_TTL_MINUTES)
    valid_states: dict[str, Any] = {}
    for state, payload in (store.get("oauth_states") or {}).items():
        created_raw = str(payload.get("created_at") or "")
        try:
            created_at = datetime.fromisoformat(created_raw)
        except ValueError:
            continue
        if created_at >= cutoff:
            valid_states[state] = payload
    store["oauth_states"] = valid_states


def _normalize_user_email(user_email: str | None) -> str:
    normalized = (user_email or "").strip().lower()
    if not normalized or "@" not in normalized:
        raise GmailOAuthError("A valid user email is required for Gmail sync.")
    return normalized


def _user_store(store: dict[str, Any], user_email: str, *, create: bool = False) -> dict[str, Any]:
    users = store.setdefault("users", {})
    if create:
        users.setdefault(user_email, {})
    return users.get(user_email) or {}


def build_gmail_oauth_url(user_email: str, return_to: str | None = None) -> tuple[str, str]:
    settings = get_settings()
    if not settings.google_client_id:
        raise ValueError("GOOGLE_CLIENT_ID is not configured.")

    normalized_user = _normalize_user_email(user_email)
    store = _load_store()
    _prune_states(store)

    state = secrets.token_urlsafe(24)
    store.setdefault("oauth_states", {})[state] = {
        "return_to": return_to or settings.frontend_origin,
        "created_at": _utcnow().isoformat(),
        "user_email": normalized_user,
    }
    _save_store(store)

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
        "scope": " ".join(settings.google_scope_list),
        "state": state,
        "login_hint": normalized_user,
        "include_granted_scopes": "true",
    }
    return f"{GOOGLE_AUTH_BASE}?{urlencode(params)}", state


def _pop_state_record(state: str | None) -> OAuthStateRecord:
    if not state:
        raise GmailOAuthError("Missing OAuth state.")

    store = _load_store()
    _prune_states(store)
    payload = (store.get("oauth_states") or {}).pop(state, None)
    _save_store(store)

    if not payload:
        raise GmailOAuthError("OAuth state is missing or expired.")

    return OAuthStateRecord(
        return_to=str(payload.get("return_to") or get_settings().frontend_origin),
        created_at=str(payload.get("created_at") or ""),
        user_email=_normalize_user_email(str(payload.get("user_email") or "")),
    )


def _store_tokens(user_email: str, token_payload: dict[str, Any]) -> None:
    normalized_user = _normalize_user_email(user_email)
    store = _load_store()
    user_data = _user_store(store, normalized_user, create=True)
    previous = user_data.get("tokens") or {}
    refresh_token = token_payload.get("refresh_token") or previous.get("refresh_token")
    expires_in = int(token_payload.get("expires_in") or 0)
    expiry = (_utcnow() + timedelta(seconds=max(0, expires_in - 60))).isoformat() if expires_in else None
    user_data["tokens"] = {
        "access_token": _encrypt_value(token_payload.get("access_token")),
        "refresh_token": _encrypt_value(refresh_token),
        "scope": token_payload.get("scope") or previous.get("scope") or "",
        "token_type": token_payload.get("token_type") or previous.get("token_type") or "Bearer",
        "token_expiry": expiry,
        "updated_at": _utcnow().isoformat(),
    }
    store.setdefault("users", {})[normalized_user] = user_data
    _save_store(store)


def _exchange_code_for_tokens(user_email: str, code: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.google_client_id or not settings.google_client_secret:
        raise GmailOAuthError("Google OAuth client credentials are not configured.")

    response = httpx.post(
        GOOGLE_TOKEN_ENDPOINT,
        data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=20.0,
    )
    if response.is_error:
        raise GmailOAuthError(f"Token exchange failed with {response.status_code}: {response.text}")

    payload = response.json()
    _store_tokens(user_email, payload)
    return payload


def complete_gmail_oauth(code: str | None, state: str | None) -> tuple[GmailConnectionStatus, str]:
    if not code:
        raise GmailOAuthError("Missing OAuth authorization code.")

    state_record = _pop_state_record(state)
    _exchange_code_for_tokens(state_record.user_email, code)
    return get_gmail_connection_status(state_record.user_email), state_record.return_to


def _refresh_access_token(user_email: str, refresh_token: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.google_client_id or not settings.google_client_secret:
        raise GmailOAuthError("Google OAuth client credentials are not configured.")

    response = httpx.post(
        GOOGLE_TOKEN_ENDPOINT,
        data={
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=20.0,
    )
    if response.is_error:
        raise GmailOAuthError(f"Token refresh failed with {response.status_code}: {response.text}")

    payload = response.json()
    _store_tokens(user_email, payload)
    return payload


def _get_valid_access_token(user_email: str) -> str:
    normalized_user = _normalize_user_email(user_email)
    store = _load_store()
    user_data = _user_store(store, normalized_user)
    tokens = user_data.get("tokens") or {}
    access_token = _decrypt_value(tokens.get("access_token"))
    refresh_token = _decrypt_value(tokens.get("refresh_token"))
    expiry_raw = tokens.get("token_expiry")

    if access_token and expiry_raw:
        try:
            expiry = datetime.fromisoformat(str(expiry_raw))
            if expiry > _utcnow():
                return str(access_token)
        except ValueError:
            pass

    if not refresh_token:
        raise GmailNotConnectedError(f"No Gmail refresh token has been stored yet for {normalized_user}.")

    refreshed = _refresh_access_token(normalized_user, str(refresh_token))
    refreshed_access_token = refreshed.get("access_token")
    if not refreshed_access_token:
        raise GmailOAuthError("Token refresh succeeded but no access token was returned.")
    return str(refreshed_access_token)


def disconnect_gmail(user_email: str) -> GmailConnectionStatus:
    normalized_user = _normalize_user_email(user_email)
    store = _load_store()
    user_data = _user_store(store, normalized_user, create=True)
    user_data["tokens"] = {}
    store.setdefault("users", {})[normalized_user] = user_data
    _save_store(store)
    return get_gmail_connection_status(normalized_user)


def get_gmail_connection_status(user_email: str) -> GmailConnectionStatus:
    normalized_user = _normalize_user_email(user_email)
    store = _load_store()
    user_data = _user_store(store, normalized_user)
    tokens = user_data.get("tokens") or {}
    refresh_token = tokens.get("refresh_token")
    scope_text = str(tokens.get("scope") or "")
    connected = bool(refresh_token)
    note = (
        f"Gmail is connected for {normalized_user} and ready to sync."
        if connected
        else f"Connect Gmail for {normalized_user} to import recent inbox messages."
    )
    return GmailConnectionStatus(
        connected=connected,
        has_refresh_token=bool(refresh_token),
        scopes=[scope for scope in scope_text.split(" ") if scope],
        token_expiry=tokens.get("token_expiry"),
        note=note,
    )


def _gmail_get(user_email: str, endpoint: str, *, params: dict[str, Any] | None = None) -> dict[str, Any]:
    access_token = _get_valid_access_token(user_email)
    response = httpx.get(
        f"{GMAIL_API_BASE}{endpoint}",
        params=params,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=20.0,
    )
    if response.is_error:
        raise GmailOAuthError(f"Gmail API request failed with {response.status_code}: {response.text}")
    return response.json()


def _header_map(payload: dict[str, Any]) -> dict[str, str]:
    headers = payload.get("headers") or []
    mapping: dict[str, str] = {}
    for header in headers:
        name = header.get("name")
        value = header.get("value")
        if name and value:
            mapping[str(name).lower()] = str(value)
    return mapping


def _decode_part_body(data: str | None) -> str:
    if not data:
        return ""
    padding = "=" * ((4 - len(data) % 4) % 4)
    try:
        return base64.urlsafe_b64decode(f"{data}{padding}").decode("utf-8", errors="ignore")
    except (ValueError, UnicodeDecodeError):
        return ""


def _extract_text(payload: dict[str, Any]) -> str:
    mime_type = str(payload.get("mimeType") or "")
    body = payload.get("body") or {}
    parts = payload.get("parts") or []

    if mime_type == "text/plain":
        text = _decode_part_body(body.get("data"))
        if text.strip():
            return text

    plain_chunks: list[str] = []
    html_chunks: list[str] = []
    for part in parts:
        text = _extract_text(part)
        if not text.strip():
            continue
        part_mime = str(part.get("mimeType") or "")
        if part_mime == "text/plain":
            plain_chunks.append(text)
        else:
            html_chunks.append(text)

    if plain_chunks:
        return "\n\n".join(chunk.strip() for chunk in plain_chunks if chunk.strip())
    if html_chunks:
        html_text = "\n\n".join(chunk.strip() for chunk in html_chunks if chunk.strip())
        return re.sub(r"<[^>]+>", " ", html_text)

    return _decode_part_body(body.get("data"))


def _extract_links(text: str) -> list[str]:
    seen: list[str] = []
    for match in LINK_RE.findall(text):
        if match not in seen:
            seen.append(match)
    return seen


def _received_at(message: dict[str, Any], headers: dict[str, str]) -> str | None:
    internal_date = message.get("internalDate")
    if internal_date:
        try:
            millis = int(str(internal_date))
            return datetime.fromtimestamp(millis / 1000, tz=UTC).isoformat()
        except (TypeError, ValueError, OSError):
            pass

    date_header = headers.get("date")
    if date_header:
        try:
            return parsedate_to_datetime(date_header).astimezone(UTC).isoformat()
        except (TypeError, ValueError, OverflowError):
            return None
    return None


def _message_to_email_input(message: dict[str, Any]) -> tuple[str, EmailInput, str | None, str | None]:
    payload = message.get("payload") or {}
    headers = _header_map(payload)
    body_text = _extract_text(payload).strip() or str(message.get("snippet") or "")
    sender_raw = headers.get("from", "unknown@gmail.com")
    sender_email_match = re.search(r"<([^>]+)>", sender_raw)
    sender_email = sender_email_match.group(1).strip() if sender_email_match else sender_raw.strip()
    sender_name = sender_raw.replace(f"<{sender_email}>", "").strip().strip('"') or None
    subject = headers.get("subject") or "(no subject)"
    label_ids = [str(label) for label in (message.get("labelIds") or [])]
    links = _extract_links(body_text)
    in_reply_thread = bool(headers.get("in-reply-to") or headers.get("references"))
    received_at = _received_at(message, headers)

    email_input = EmailInput(
        sender_name=sender_name,
        sender_email=sender_email,
        subject=subject,
        body_text=body_text,
        links=links,
        known_contact=False,
        in_reply_thread=in_reply_thread,
        starred="STARRED" in label_ids,
    )
    return str(message.get("id") or ""), email_input, str(message.get("threadId") or "") or None, received_at


def sync_recent_gmail_messages(user_email: str, limit: int = 10, page_token: str | None = None) -> tuple[list[GmailSyncedMessage], str | None]:
    safe_limit = max(1, min(limit, 25))
    listing = _gmail_get(
        user_email,
        "/messages",
        params={
            "maxResults": safe_limit,
            "labelIds": "INBOX",
            "includeSpamTrash": "false",
            **({"pageToken": page_token} if page_token else {}),
        },
    )

    messages = listing.get("messages") or []
    synced: list[GmailSyncedMessage] = []
    for message_ref in messages:
        message_id = message_ref.get("id")
        if not message_id:
            continue
        detail = _gmail_get(user_email, f"/messages/{message_id}", params={"format": "full"})
        gmail_message_id, email_input, thread_id, received_at = _message_to_email_input(detail)
        classification: ClassificationResult = classify_email(email_input)
        synced.append(
            GmailSyncedMessage(
                gmail_message_id=gmail_message_id,
                thread_id=thread_id,
                email=email_input,
                classification=classification,
                received_at=received_at,
            )
        )

    return synced, listing.get("nextPageToken")
