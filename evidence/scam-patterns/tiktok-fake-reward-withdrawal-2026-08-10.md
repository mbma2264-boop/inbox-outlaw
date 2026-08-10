# Scam Evidence: Fake TikTok Reward / Withdrawal Fee

**Date captured:** 2026-08-10
**Classification:** Phishing / Brand Impersonation / Fake Reward / Advance-Fee Withdrawal Scam
**Risk:** High
**Impersonated brand:** TikTok
**Observed host:** `tkacess.vercel.app`
**Legitimate TikTok domain:** `tiktok.com`

## Evidence observed

A mobile webpage opened inside the TikTok in-app browser and visually impersonated TikTok. The address bar showed `tkacess.vercel.app`, not a TikTok-owned domain.

The page claimed:
- “OFFER EXPIRES IN” with a countdown timer.
- “WITHDRAWAL PAUSED.”
- A `$2,800.00` reward was reserved for only a few more minutes.
- “security verification” was the final step to release the withdrawal.
- “EXCLUSIVE DISCOUNT.”
- A purported reduction from `$37.12` and “Save $16.42.”
- “RELEASE $2,800.00.”
- “Refund of $20.70 in 1 minute.”
- Claims such as secure payment, refundable payment, instant release, and ratings/social-proof elements.

## Scam indicators

1. **Brand/domain mismatch:** TikTok branding is displayed on a non-TikTok `vercel.app` hostname.
2. **Advance-fee pattern:** A payment/verification charge is presented as necessary to release a much larger reward.
3. **Artificial urgency:** Countdown and statements that the reward is reserved for only minutes pressure the target to act quickly.
4. **Withdrawal obstruction:** “Withdrawal paused” creates a fabricated problem that the requested payment supposedly resolves.
5. **Refund assurance:** Promising an almost immediate refund reduces resistance to paying the fee.
6. **Large unexpected reward:** `$2,800` is used as the incentive for completing the payment step.
7. **Brand impersonation:** TikTok logo and visual styling are used to create false legitimacy.

## Inbox Outlaw classification

Primary: **Phishing → Brand Impersonation**

Secondary tags:
- `fake-reward`
- `advance-fee`
- `withdrawal-fee`
- `social-media-impersonation`
- `tiktok-impersonation`
- `countdown-pressure`
- `fake-verification`
- `refund-promise`
- `domain-mismatch`
- `vercel-hosted`

## Detection rules / signals to incorporate

Increase scam-risk score when combinations of these signals occur:
- Recognizable brand name/logo paired with an unrelated hostname.
- Terms such as `withdrawal paused`, `release withdrawal`, `security verification`, `reward reserved`, or `instant release`.
- A large promised reward combined with a small required payment.
- Countdown timer or expiration language near a payment/release CTA.
- Claims that a verification/release payment is refundable immediately.
- Hosted subdomains (`*.vercel.app`, etc.) impersonating financial or social-media brands.

**Recommended Inbox Outlaw verdict:** HIGH RISK — likely phishing/advance-fee scam. Do not pay, enter credentials, provide verification codes, or submit financial information.

## Source artifact

Original screenshot supplied by the user in ChatGPT on 2026-08-10. Screenshot shows the hostname and the scam-page claims listed above.
