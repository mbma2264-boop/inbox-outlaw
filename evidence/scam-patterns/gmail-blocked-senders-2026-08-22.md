# Gmail Blocked-Sender Indicator Set — 2026-08-22

## Record status

- **Source:** Gmail blocked-address settings supplied by the account owner
- **Total indicators:** 26
- **Inbox behavior:** Messages from these addresses are routed to Spam
- **Evidence status:** User-confirmed blocked senders
- **Inbox Outlaw trust level:** Suspicious / blocked by user
- **Important limitation:** A block is a useful risk indicator but does not, by itself, prove criminal control of every address.

## Blocked addresses

1. `mrssusanksteinhauer888@gmail.com`
2. `nathanweather0@gmail.com`
3. `davidimckay023@gmail.com`
4. `handsmrhelping@gmail.com`
5. `support@apextrustltd.online`
6. `mrdonaldtrump902@gmail.com`
7. `paypaloffice1234567899@gmail.com`
8. `info@delisaz.com`
9. `bfybinv5806580@gmail.com`
10. `stuff@gcardgrabber.com`
11. `jamesamechi875@gmail.com`
12. `cherihaspelmrsglna926@gmail.com`
13. `info@savemyit.com`
14. `mg8515167@gmail.com`
15. `**payment/overdue***@91gwy.net`
16. `ericjohnson1388@gmail.com`
17. `mrsmithattention@gmail.com`
18. `stuartrabnermrjustice3@gmail.com`
19. `updates@email1.writeappreviews.com`
20. `bof061035@gmail.com`
21. `lj@ljaviles.com`
22. `ministryoffinace177@gmail.com`
23. `info@secureloanedge.com`
24. `thamosrichar@gmail.com`
25. `mrbillylongirsdirectorirsdirec@gmail.com`
26. `support@theageofchaos.com`

## Priority impersonation and fraud signals

- `mrdonaldtrump902@gmail.com` — public-figure impersonation signal
- `paypaloffice1234567899@gmail.com` — financial-brand impersonation signal
- `stuartrabnermrjustice3@gmail.com` — judicial/public-official impersonation signal; correlate with the existing Stuart Rabner evidence case
- `ministryoffinace177@gmail.com` — government/finance-authority impersonation signal and misspelled “finance”
- `mrbillylongirsdirectorirsdirec@gmail.com` — IRS/government impersonation signal
- `support@apextrustltd.online` and `info@secureloanedge.com` — finance, trust, or loan framing; retain for message-level correlation before stronger attribution
- `**payment/overdue***@91gwy.net` — payment-pressure wording and an unusual displayed-address pattern; preserve raw headers if available

## Inbox Outlaw handling

- Treat exact matches as blocked threat indicators.
- Route matching messages to Spam/high-risk review.
- Retain evidence instead of automatically deleting it.
- Correlate matches with screenshots, raw headers, domains, URLs, payment destinations, impersonated identities, and earlier cases.
- Do not label an address “confirmed criminal” without supporting message or infrastructure evidence.
