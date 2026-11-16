# Compliance

General UK rules as understood in planning; **not legal advice**. Check with the client's legal adviser.

## Data protection (UK GDPR)
- Each franchisor (Client) owns their leads; Franchise Right processes them. **A data processing agreement with every client**, including a clause allowing **anonymised, combined data** to be used to improve the service (cross-brand learning).
- The database is in the UK (Neon London). The server, email and backups are with AWS in Sweden (decision 107), which UK rules allow.
- Privacy notice per client says what's collected, that **calls are recorded and analysed**, and how long data is kept.
- Retention rules, deletion and export on request, audit log of who viewed, changed, exported or deleted what.
- Strict client separation, tested automatically.

## Paperwork to draft (Claude drafts, a person checks and signs)
- Data protection impact assessment (recording, AI analysis, scoring)
- Lawful basis for each kind of processing
- Sub-processor list (AWS, Neon, Anthropic, Zoom, Meta, later Twilio) and cover for data sent outside the UK
- Franchise Right's ICO registration checked
- Client agreement: brand-name domain permission, and what happens to the domain and data when a client leaves
- Transcript extraction must not store health or similar sensitive details as fields
- A human route for anyone the form filters out (Stage B)

## Consent and marketing (PECR)
- Consent tick box with the exact wording and timestamp saved per lead.
- No WhatsApp tick (removed 16 Nov 2026, decision 111).
- Unsubscribe in every email, plus Gmail/Yahoo **one-click unsubscribe**; a suppression list respected by every chain.
- No chasing people who abandoned the form: drop-off tracking is anonymous and never stores what they typed.
- **No cookie banner:** no Meta pixel loads before the form is submitted; the form's required tick box and small print cover sharing with Meta; events go from the server afterwards. Own page and video stats run without cookies. Wording needs a legal check, and a required tick is weaker consent than an optional one.

## Email sending
- SPF, DKIM and DMARC on every franchise domain; warm new domains gradually.
- Bounces and spam complaints suppressed automatically; complaint rate kept under Gmail's limit, with alerts.

## Call recording
- Lead hears a short notice ("Calls may be recorded for quality and training"); also stated in the booking confirmation and privacy notice.
- Recordings stored securely and deleted after a set period.

## Equality
- Fit scoring and form filtering use what predicts success (experience running a business or team, money and reserves, timing, motivation, connection to property, behaviour). **Never age or gender.**
- Age and gender may describe who tends to buy (e.g. for creative), but not who is accepted.
- No inferring age from video frames.

## Advertising and claims
- Every earnings or funding figure traced to a source and worded carefully (fact and compliance checker).
- Franchise ads run in Meta's Employment special category (no age/gender/postcode targeting; 10-mile minimum city radius).
- Franchisee interview figures (e.g. Ali's revenue) are rough until checked, and only used with consent.
