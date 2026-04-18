from urllib.parse import urlencode

from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.core.config import get_settings
from app.schemas import (
    ClassificationResult,
    EmailInput,
    GmailConnectionStatus,
    GmailOAuthStartResponse,
    GmailSyncResponse,
)
from app.services.classifier import classify_email
from app.services.gmail_oauth import (
    GmailNotConnectedError,
    GmailOAuthError,
    build_gmail_oauth_url,
    complete_gmail_oauth,
    disconnect_gmail,
    get_gmail_connection_status,
    sync_recent_gmail_messages,
)

router = APIRouter(prefix="/api", tags=["api"])


def _require_user_email(x_demo_user: str | None) -> str:
    user_email = (x_demo_user or "").strip().lower()
    if not user_email or "@" not in user_email:
        raise HTTPException(status_code=400, detail="A valid X-Demo-User header is required.")
    return user_email


@router.post("/classify", response_model=ClassificationResult)
def classify(email: EmailInput) -> ClassificationResult:
    return classify_email(email)


@router.get("/gmail/status", response_model=GmailConnectionStatus)
def gmail_status(x_demo_user: str | None = Header(default=None)) -> GmailConnectionStatus:
    return get_gmail_connection_status(_require_user_email(x_demo_user))


@router.get("/gmail/oauth/start", response_model=GmailOAuthStartResponse)
def gmail_oauth_start(
    return_to: str | None = Query(default=None),
    x_demo_user: str | None = Header(default=None),
) -> GmailOAuthStartResponse:
    try:
        authorization_url, state = build_gmail_oauth_url(_require_user_email(x_demo_user), return_to=return_to)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except GmailOAuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return GmailOAuthStartResponse(
        authorization_url=authorization_url,
        state=state,
        note="Open the authorization URL in the browser to connect Gmail.",
    )


@router.get("/gmail/oauth/callback")
def gmail_oauth_callback(code: str | None = None, state: str | None = None):
    try:
        status, redirect_to = complete_gmail_oauth(code=code, state=state)
    except GmailOAuthError as exc:
        fallback = f"{get_settings().frontend_origin}/dashboard"
        params = urlencode({"gmail": "error", "message": str(exc)})
        return RedirectResponse(url=f"{fallback}?{params}", status_code=302)

    params = urlencode({"gmail": "connected", "connected": str(status.connected).lower()})
    separator = "&" if "?" in redirect_to else "?"
    return RedirectResponse(url=f"{redirect_to}{separator}{params}", status_code=302)


@router.post("/gmail/sync", response_model=GmailSyncResponse)
def gmail_sync(
    limit: int = Query(default=10, ge=1, le=25),
    page_token: str | None = Query(default=None),
    x_demo_user: str | None = Header(default=None),
) -> GmailSyncResponse:
    try:
        messages, next_page_token = sync_recent_gmail_messages(
            _require_user_email(x_demo_user),
            limit=limit,
            page_token=page_token,
        )
    except GmailNotConnectedError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except GmailOAuthError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return GmailSyncResponse(
        imported_count=len(messages),
        next_page_token=next_page_token,
        messages=messages,
    )


@router.post("/gmail/disconnect", response_model=GmailConnectionStatus)
def gmail_disconnect(x_demo_user: str | None = Header(default=None)) -> GmailConnectionStatus:
    try:
        return disconnect_gmail(_require_user_email(x_demo_user))
    except GmailOAuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
