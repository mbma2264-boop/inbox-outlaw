# Scam Evidence: Fake $2,100 Account Statement / Balance Lure

**Date captured:** 2026-08-24  
**Message date:** 2026-08-24 at 1:04 AM  
**Message type:** Account Alert  
**Trust level:** High Risk  
**Classification:** Fake Account Statement / Unexpected Balance / Link Phishing  
**Observed sender:** `company INC <admin@liveresults.live>`  
**Observed reply-to:** `company INC <admin@liveresults.live>`  
**Observed subject:** `$2,100 balance • #ACC-7766`  
**Observed domain:** `liveresults.live`

The recipient address shown in the supplied screenshot is intentionally redacted because this repository is public.

## Evidence observed

The user supplied two Gmail mobile screenshots showing:

- Subject: “$2,100 balance • #ACC-7766.”
- Sender display name: “company INC.”
- Sender and reply-to: `admin@liveresults.live`.
- An embedded “ACCOUNT STATEMENT.”
- Statement period: “May 1–27, 2026.”
- Account number: `ACC-7766`.
- Claimed available balance: `$2,100.00`.
- CTA: “VIEW FULL STATEMENT.”
- Instruction to report discrepancies within 14 days.
- Claim that statements are archived for 24 months.
- Contact address: `accounting@firm.com`.
- Business name: “Liveresults.”
- Displayed address: “Avenue Louise 149, Brussels Brabant Wallon 1050, Belgium.”
- Subscription-management link.

## Scam indicators

1. **Unexpected financial balance:** The recipient was presented with an unexplained $2,100 balance and unfamiliar account number.
2. **Vague sender identity:** “company INC” is generic and does not identify a real financial institution or account provider.
3. **Domain/business mismatch:** `liveresults.live` has no verified connection to a bank, brokerage, payment platform, or recognized statement issuer.
4. **Placeholder contact:** `accounting@firm.com` reads like template or placeholder content and does not match the sender domain.
5. **Date inconsistency:** The email was sent August 24, 2026, while the purported monthly statement covers May 1–27, 2026.
6. **Location inconsistency:** The displayed Brussels address combines “Brussels,” “Brabant Wallon,” and postal code 1050 in a suspicious/inaccurate format.
7. **Action lure:** “VIEW FULL STATEMENT” invites the recipient to follow a link to investigate an unfamiliar balance.
8. **False-account framing:** A fabricated-looking account identifier creates curiosity and urgency without naming the underlying service.
9. **Template residue:** Generic corporate language, placeholder contact information, and inconsistent identity fields suggest a mass-produced lure.
10. **Weak public identity:** Exact searches did not locate a legitimate Liveresults financial company matching the email.
11. **Shared hosting only:** Public infrastructure data associates `liveresults.live` with a shared host also serving unrelated domains. This is a contextual signal, not proof of common ownership.

## Inbox Outlaw classification

Primary: **Phishing → Fake Account Statement**

Secondary tags:
- `unexpected-balance`
- `fake-account`
- `statement-lure`
- `financial-phishing`
- `generic-company-name`
- `placeholder-contact`
- `sender-contact-mismatch`
- `date-inconsistency`
- `address-inconsistency`
- `link-click-lure`
- `liveresults-live`

## Detection rules / signals to incorporate

Increase risk when combinations include:
- An unexpected account balance paired with an unfamiliar account number.
- A “view statement” or “view balance” CTA from an unknown sender.
- Generic display names such as “company INC.”
- Sender domain and accounting/support contact domain do not match.
- Placeholder-style contacts such as `accounting@firm.com`.
- Statement periods substantially predating the delivery date without explanation.
- Corporate addresses with conflicting city, region, or postal-code details.
- Financial language sent from a domain with no verifiable financial identity.

## Recommended handling

Do not click “VIEW FULL STATEMENT,” reply, use the subscription link, or provide credentials, personal information, banking information, or payment. Mark the message as phishing/spam and preserve the screenshots and original headers for evidence.

**Recommended verdict:** HIGH RISK — likely fake account-statement phishing lure.

## Source artifacts

Two original screenshots supplied by the user in ChatGPT on 2026-08-24. They show the message headers, subject, balance claim, account number, statement content, CTA, contact information, and displayed address described above.
