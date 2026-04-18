from __future__ import annotations

import json
from typing import TYPE_CHECKING

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - exercised indirectly in tests/envs without openai installed
    OpenAI = None  # type: ignore[assignment]

from app.core.config import get_settings
from app.schemas import ClassificationResult


def maybe_refine_with_openai(
    sender_email: str,
    subject: str,
    body_text: str,
    draft: ClassificationResult,
) -> ClassificationResult:
    settings = get_settings()
    if not settings.openai_api_key or OpenAI is None:
        return draft

    client = OpenAI(api_key=settings.openai_api_key)

    prompt = f"""
You are improving an email safety classifier.

Return strict JSON with keys:
category, confidence_score, reasons, recommended_action

Allowed category values:
Scam, Likely Scam, Personal, Opportunity, Verified Business, Promotion, Transactional, Needs Review

Current draft:
{draft.model_dump_json(indent=2)}

Email:
Sender: {sender_email}
Subject: {subject}
Body:
{body_text[:4000]}
"""

    response = client.responses.create(
        model=settings.openai_model,
        input=prompt,
    )

    raw_text = getattr(response, "output_text", "").strip()
    if not raw_text:
        return draft

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        return draft

    category = parsed.get("category", draft.category)
    confidence_score = int(parsed.get("confidence_score", draft.confidence_score))
    reasons = parsed.get("reasons", draft.reasons)
    recommended_action = parsed.get("recommended_action", draft.recommended_action)

    if not isinstance(reasons, list) or not all(isinstance(item, str) for item in reasons):
        reasons = draft.reasons

    return ClassificationResult(
        category=category,
        risk_score=draft.risk_score,
        confidence_score=max(0, min(100, confidence_score)),
        reasons=reasons,
        matched_rules=draft.matched_rules,
        recommended_action=recommended_action,
        used_llm=True,
    )
