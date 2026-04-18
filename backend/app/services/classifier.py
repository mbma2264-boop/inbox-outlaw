from __future__ import annotations

from collections import Counter

from app.schemas import ClassificationResult, EmailInput, RuleMatch
from app.services.openai_client import maybe_refine_with_openai
from app.services.rules import collect_rule_matches


def _bounded_score(value: int) -> int:
    return max(0, min(100, value))


def classify_email(email: EmailInput) -> ClassificationResult:
    matches = collect_rule_matches(email)
    total = sum(match.weight for match in matches)
    risk_score = _bounded_score(20 + total)

    rule_ids = {match.rule_id for match in matches}
    reasons = [match.reason for match in matches]

    if "known_contact" in rule_ids or "reply_thread" in rule_ids:
        if any(rule_id in rule_ids for rule_id in ("transactional_language",)):
            category = "Transactional"
            recommended_action = "Keep visible"
        else:
            category = "Personal"
            recommended_action = "Keep visible"
    elif "transactional_language" in rule_ids and risk_score < 35:
        category = "Transactional"
        recommended_action = "Keep visible"
    elif risk_score >= 70:
        category = "Scam"
        recommended_action = "Quarantine and report to provider"
    elif 45 <= risk_score < 70:
        category = "Likely Scam"
        recommended_action = "Quarantine"
    elif "jv_or_partner_language" in rule_ids or "launch_language" in rule_ids:
        if risk_score < 45:
            category = "Opportunity"
            recommended_action = "Keep visible and highlight"
        else:
            category = "Needs Review"
            recommended_action = "Review manually"
    elif any(rule_id in rule_ids for rule_id in ("newsletter_language", "promotion_language")):
        category = "Promotion"
        recommended_action = "Archive or unsubscribe when safe"
    else:
        category = "Needs Review"
        recommended_action = "Review manually"

    confidence = 55
    if matches:
        confidence += min(30, len(matches) * 5)
    if category in {"Scam", "Likely Scam"} and risk_score >= 70:
        confidence += 10
    if "known_contact" in rule_ids or "reply_thread" in rule_ids:
        confidence += 10
    confidence_score = _bounded_score(confidence)

    draft = ClassificationResult(
        category=category,  # type: ignore[arg-type]
        risk_score=risk_score,
        confidence_score=confidence_score,
        reasons=reasons[:5] if reasons else ["No strong rule matched. Review recommended."],
        matched_rules=matches,
        recommended_action=recommended_action,
        used_llm=False,
    )

    # Only ask the model for ambiguous cases.
    if category in {"Opportunity", "Needs Review", "Promotion", "Likely Scam"}:
        return maybe_refine_with_openai(
            sender_email=email.sender_email,
            subject=email.subject,
            body_text=email.body_text,
            draft=draft,
        )

    return draft
