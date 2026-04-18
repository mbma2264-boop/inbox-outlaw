from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable, List

from app.schemas import EmailInput, RuleMatch


@dataclass(frozen=True)
class Rule:
    rule_id: str
    weight: int
    reason: str
    patterns: tuple[str, ...]
    field: str = "body_text"

    def matches(self, email: EmailInput) -> bool:
        target = getattr(email, self.field, "") or ""
        target = target.lower()
        return any(re.search(pattern, target) for pattern in self.patterns)


SCAM_RULES: tuple[Rule, ...] = (
    Rule(
        rule_id="advance_fee_request",
        weight=35,
        reason="The email asks for money or a fee before funds can be released.",
        patterns=(r"release (your )?funds?", r"pay (a )?fee", r"processing fee", r"unlock your wallet"),
    ),
    Rule(
        rule_id="unrealistic_income_claim",
        weight=20,
        reason="The email makes unrealistic money or income promises.",
        patterns=(r"\$?\d{1,3},?\d{3}\s*(per day|daily)", r"10k/day", r"earn money fast", r"guaranteed income"),
    ),
    Rule(
        rule_id="urgency_language",
        weight=10,
        reason="The email uses pressure or urgency language.",
        patterns=(r"urgent", r"act now", r"final notice", r"immediately", r"within 24 hours"),
    ),
    Rule(
        rule_id="wallet_or_credentials_request",
        weight=25,
        reason="The email asks for wallet keys, bank data, passwords, or similar sensitive details.",
        patterns=(r"private key", r"seed phrase", r"bank account", r"gift card", r"password"),
    ),
    Rule(
        rule_id="impersonation_hint",
        weight=25,
        reason="The sender appears to impersonate an official organization or public figure.",
        patterns=(r"irs", r"fbi", r"government grant", r"bank alert", r"ceo request"),
    ),
)

PROMOTION_RULES: tuple[Rule, ...] = (
    Rule(
        rule_id="newsletter_language",
        weight=18,
        reason="The message looks like a newsletter or recurring marketing email.",
        patterns=(r"unsubscribe", r"view in browser", r"weekly update", r"newsletter"),
    ),
    Rule(
        rule_id="promotion_language",
        weight=15,
        reason="The message uses common promotional language.",
        patterns=(r"limited time offer", r"special offer", r"sale ends", r"discount", r"webinar"),
    ),
)

AFFILIATE_OPPORTUNITY_RULES: tuple[Rule, ...] = (
    Rule(
        rule_id="jv_or_partner_language",
        weight=20,
        reason="The email contains JV, partner, or collaboration language.",
        patterns=(r"\bjv\b", r"joint venture", r"partnership opportunity", r"collaborate", r"affiliate partner"),
    ),
    Rule(
        rule_id="launch_language",
        weight=15,
        reason="The email looks like a launch or campaign opportunity.",
        patterns=(r"launch date", r"affiliate launch", r"promo starts", r"commission structure", r"epc"),
    ),
)

TRANSACTIONAL_RULES: tuple[Rule, ...] = (
    Rule(
        rule_id="transactional_language",
        weight=-20,
        reason="The email looks transactional, like a receipt, invoice, or account alert.",
        patterns=(r"receipt", r"invoice", r"payment received", r"security alert", r"password reset"),
    ),
)

PERSONAL_RULES: tuple[Rule, ...] = (
    Rule(
        rule_id="personal_conversation_tone",
        weight=-25,
        reason="The email looks like a normal personal conversation.",
        patterns=(r"how are you", r"call me", r"see you", r"love you", r"thanks for checking in"),
    ),
)


def _free_mail_domain(sender_email: str) -> bool:
    domain = sender_email.split("@")[-1].lower()
    return domain in {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"}


def _display_name_mismatch(sender_name: str | None, sender_email: str) -> bool:
    if not sender_name:
        return False
    sender_name = sender_name.lower()
    domain_part = sender_email.split("@")[-1].split(".")[0].lower()
    if domain_part in sender_name:
        return False
    suspicious_org_terms = ("bank", "support", "government", "crypto", "office", "team")
    return any(term in sender_name for term in suspicious_org_terms)


def collect_rule_matches(email: EmailInput) -> List[RuleMatch]:
    matches: list[RuleMatch] = []

    for rule in (*SCAM_RULES, *PROMOTION_RULES, *AFFILIATE_OPPORTUNITY_RULES, *TRANSACTIONAL_RULES, *PERSONAL_RULES):
        if rule.matches(email):
            matches.append(RuleMatch(rule_id=rule.rule_id, weight=rule.weight, reason=rule.reason))

    if _free_mail_domain(email.sender_email) and any(
        token in (email.sender_name or "").lower() for token in ("bank", "support", "office", "government")
    ):
        matches.append(
            RuleMatch(
                rule_id="free_mail_impersonation",
                weight=20,
                reason="The sender uses a free email provider while appearing to claim an official identity.",
            )
        )

    if _display_name_mismatch(email.sender_name, email.sender_email):
        matches.append(
            RuleMatch(
                rule_id="display_name_domain_mismatch",
                weight=10,
                reason="The sender display name does not clearly match the sender address or domain.",
            )
        )

    if email.known_contact:
        matches.append(
            RuleMatch(
                rule_id="known_contact",
                weight=-30,
                reason="This sender is marked as a known contact.",
            )
        )

    if email.in_reply_thread:
        matches.append(
            RuleMatch(
                rule_id="reply_thread",
                weight=-20,
                reason="The message is part of an existing reply thread.",
            )
        )

    if email.starred:
        matches.append(
            RuleMatch(
                rule_id="starred_message",
                weight=-15,
                reason="The message is starred or marked important.",
            )
        )

    return matches
