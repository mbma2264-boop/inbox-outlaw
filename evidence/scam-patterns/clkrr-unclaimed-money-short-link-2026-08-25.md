# Scam Evidence: “Claim Your Unclaimed Money” Short-Link Lure

**Date captured:** 2026-08-25  
**Message type:** Sweepstakes / Promotion  
**Trust level:** High Risk  
**Classification:** Unclaimed-Money Phishing / Short-Link Redirect / Appointment Funnel  
**Observed URL:** `https://o.clkrr.co/special`  
**Observed domain:** `clkrr.co`

## Evidence observed

The user received this unsolicited message:

> Great! You can claim your unclaimed money and pick a time that works best for you here: [shortened link]

The message does not identify:
- A state unclaimed-property office.
- A government agency.
- A specific property holder.
- The amount or source of the alleged property.
- A claim or property identification number.
- A verifiable business or representative.

The link uses the opaque subdomain and path `o.clkrr.co/special`, concealing the ultimate destination. Safe web inspection could not establish a legitimate official destination or business identity.

## Scam indicators

1. **Unsolicited money claim:** The recipient is told money is available without having initiated a search.
2. **Non-government domain:** The link does not use a state or federal `.gov` domain.
3. **Opaque redirect:** A short/tracking-style link hides the final website.
4. **Missing identity:** No agency, state, holder, amount, property ID, sender identity, or case information is provided.
5. **Appointment funnel:** “Pick a time that works best” attempts to move the recipient into a call or sales/recovery process.
6. **Presumptive language:** “Great!” falsely implies an earlier verified interaction or successful claim discovery.
7. **Official warning match:** The FTC warns that state unclaimed-property programs do not send unexpected texts containing unclaimed-property claim links.
8. **Potential follow-on risk:** The destination may seek identity documents, Social Security information, banking data, a recovery percentage, or an upfront processing fee.

## Inbox Outlaw classification

Primary: **Phishing → Unclaimed Money / Government-Service Lure**

Secondary tags:
- `unclaimed-money`
- `unexpected-message`
- `short-link`
- `hidden-destination`
- `appointment-funnel`
- `financial-lure`
- `identity-theft-risk`
- `advance-fee-risk`
- `non-government-domain`
- `clkrr-co`

## Detection rules / signals to incorporate

Increase risk when combinations include:
- “Claim your unclaimed money” in an unexpected text, email, or social message.
- A non-`.gov` or shortened link used for an alleged government-held property claim.
- Invitations to schedule a call before any identifiable property record is shown.
- Missing state, agency, property holder, amount, and claim number.
- Requests for SSN, banking information, ID copies, processing fees, taxes, gift cards, cryptocurrency, or recovery fees.

## Recommended handling

Do not click the link, schedule an appointment, reply, or provide identity or financial information. Block/report the sender and preserve the original message metadata.

To search safely, start independently through the official state unclaimed-property office reached from `unclaimed.org/search`. Never use the link supplied in an unsolicited message.

**Recommended verdict:** HIGH RISK — likely unclaimed-money phishing or predatory recovery-service funnel.

## Source artifact

Original message text supplied by the user in ChatGPT on 2026-08-25.
