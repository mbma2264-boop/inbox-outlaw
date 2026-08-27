# Scam Evidence: “Mark Gorak” Delivery Department Package Contact

**Date captured:** 2026-08-27  
**Message type:** iMessage / unsolicited package contact  
**Trust level:** High Risk  
**Classification:** Suspected Fake Package Delivery / Advance-Fee Setup / Identity Pretexting  
**Claimed sender:** Mark Gorak  
**Observed phone:** `+1 (415) 203-7196`  
**Displayed iPhone label:** “Maybe: Mark Gorak”  
**Carrier or company identified:** None  
**Tracking number provided:** None

## Message observed

> Good day, Ms. Michelle Bush.
>
> I hope you are doing well and staying safe and healthy.
>
> My name is Mark Gorak, and I am contacting you from the Delivery Department. I am the authorized representative assigned to assist with the delivery and processing of your package.
>
> Please let me know when you are available so we can discuss the next steps.

The user supplied an iPhone contact-details screenshot showing the conversation associated with `+1 (415) 203-7196`. The “Maybe: Mark Gorak” label is an Apple contact suggestion and is not independent identity verification.

## Evidence and risk indicators

1. **Unsolicited package claim:** The contact asserts possession or responsibility for a package without identifying an order or known shipment.
2. **No company or carrier:** “Delivery Department” is generic. USPS, UPS, FedEx, DHL, a retailer, and any other responsible business are not named.
3. **No shipment details:** No sender, origin, destination, tracking number, order number, carrier record, delivery date, or package description is supplied.
4. **Vague “processing” language:** “Delivery and processing” is commonly used to prepare a later request for a delivery, customs, clearance, insurance, certificate, or handling fee.
5. **Conversation-first approach:** The sender asks when the recipient is available instead of providing independently verifiable shipment information.
6. **Unverified personal number:** The contact uses an ordinary San Francisco-area number rather than an official carrier short code or a phone channel verifiable through a carrier’s website.
7. **Personalized identity pretext:** The message uses the recipient’s full name, showing that the sender already possesses some personal information. That does not establish legitimacy.
8. **Name search mismatch:** Exact searches found no verifiable connection between this phone number, this name, and a delivery company.
9. **Possible borrowed identity:** A public official named Mark Gorak is associated with U.S. Department of Defense technology leadership, not package delivery. The shared name does not prove the sender is that person and may be coincidental or impersonated.
10. **Known scam pattern:** FTC and U.S. Postal Inspection Service guidance warns that unexpected package communications are used to obtain personal or financial information. Legitimate shipment questions should be verified through the retailer or carrier using independently obtained contact information.

## Inbox Outlaw classification

Primary: **Phishing / Social Engineering → Fake Package Delivery Contact**

Secondary tags:
- `package-delivery-pretext`
- `advance-fee-setup`
- `identity-pretexting`
- `conversation-first`
- `missing-carrier`
- `missing-tracking-number`
- `processing-fee-language`
- `full-name-known`
- `unknown-imessage-sender`
- `phone-415-203-7196`
- `claimed-mark-gorak`

## Detection rules / signals to incorporate

Increase risk when an unsolicited message combines:
- A vague package or delivery claim.
- “Authorized representative,” “delivery department,” or “processing” language.
- No carrier, retailer, sender, or tracking number.
- A request to reply, call, or state availability before shipment details are supplied.
- A later request for delivery, insurance, customs, clearance, storage, certificate, or processing fees.
- Requests for an address, ID, Social Security number, bank details, card information, cryptocurrency, gift cards, or account access.
- Use of a known person’s name without an independently verifiable organizational channel.

## Recommended handling

Do not reply, call, confirm availability, confirm the delivery address, or provide identification or payment. Do not send a “small” release or processing fee.

If a real package may be expected, check the retailer account or carrier website directly using an independently obtained URL or phone number. Do not rely on details supplied by this sender.

Preserve the full conversation, timestamps, number, any payment instructions, wallet addresses, emails, links, receipts, and voicemails. Block and report the sender. The number may be spoofed, so it should be treated as an observed contact point rather than proof of the operator’s identity.

**Recommended verdict:** HIGH RISK — likely fake-package social-engineering contact and probable advance-fee setup. Not independently verified as a legitimate delivery representative.

## Public safety references

- U.S. Postal Inspection Service, “Smishing: Package Tracking Text Scams”: https://www.uspis.gov/news/scam-article/smishing-package-tracking-text-scams
- Federal Trade Commission, “Fake shipping notification emails and text messages”: https://consumer.ftc.gov/consumer-alerts/2023/12/fake-shipping-notification-emails-text-messages-what-you-need-know-holiday-season

## Source artifact

Original iPhone screenshot and message text supplied by the user in ChatGPT on 2026-08-27. The screenshot shows the claimed contact name, phone number, iMessage context, and Apple-generated “Maybe” label described above. The screenshot itself is not published in this public repository to avoid unnecessary exposure of the user’s device information.
