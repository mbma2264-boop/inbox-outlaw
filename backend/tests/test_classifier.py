from app.schemas import EmailInput
from app.services.classifier import classify_email


def test_scam_email_gets_flagged() -> None:
    email = EmailInput(
        sender_name="Bank Security Team",
        sender_email="securitynotice@gmail.com",
        subject="Urgent: pay fee to release funds",
        body_text="Act now. Pay a processing fee to release your funds immediately.",
    )
    result = classify_email(email)
    assert result.category in {"Scam", "Likely Scam"}
    assert result.risk_score >= 45


def test_known_contact_is_personal() -> None:
    email = EmailInput(
        sender_name="Mom",
        sender_email="mom@example.com",
        subject="Call me later",
        body_text="How are you? Call me when you can.",
        known_contact=True,
        in_reply_thread=True,
    )
    result = classify_email(email)
    assert result.category == "Personal"
