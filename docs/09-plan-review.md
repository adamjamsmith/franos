# Plan review (Fable 5.2, 14 November 2026)

A critical read of the whole plan before building. Nothing in the decisions log has been changed. Each item below is a recommendation for Adam to accept or reject.

**Verdict:** the direction is sound and the stack is a sensible one. Six things need fixing or deciding before code is written, and five more need tightening. The biggest risk is not technical: it is how much has to be built before Refresh Renovation can launch.

Items marked *(to confirm)* rest on my understanding of a third party's rules and should be checked against their current documentation.

---

## A. Fix or decide before building

### A1. Too much is scheduled before Refresh can launch
The plan puts Phases 0–4 before go-live: login, pages, both funnels, email in and out, booking, Zoom/Meet, a phone system, transcripts, pipeline and dashboard. That is a whole platform, and there is no time estimate or launch date.

**Recommend:** split launch into a thin first version and a second wave.
- **Launch version:** foundations, both funnels, form, video tracking, outbound email with click tracking and unsubscribe, booking page, Zoom connection, Meta events, leads list with timeline, simple board, call outcome buttons.
- **Second wave (after launch):** tracked phone number, inbound email relay, automatic transcript extraction, dashboards beyond the basics.
- If the launch date is close, launch Refresh on the existing GHL template and move it later, as planned for Oven Rescue.

### A2. Email reply tracking will not work as written (decision 13)
The plan says the consultant replies through a "send as" alias that goes out through franOS. Amazon SES sends email but does not keep or expose what was sent, so a reply sent that way is invisible to franOS unless we run our own always-on mail server.

There is a second problem: forwarding a lead's email to the consultant unchanged fails the sender checks (DMARC) for many senders, so it lands in spam or bounces.

**Recommend:** use the method helpdesk tools use.
- franOS receives the lead's email, logs it, and sends the consultant a fresh copy from the franchise address, with a reply address that routes back to franOS.
- The consultant hits reply as normal. The reply arrives at franOS, is logged, and is sent on to the lead from the franchise address.
- Nothing to set up in the consultant's email. Works with Gmail, Outlook or anything else.
- **Limit:** a brand-new email the consultant starts from their own inbox is not tracked. They start new emails from the lead's page in franOS instead.

### A3. The plan has no engine for timed work
"Send this two days later", call reminders, the path engine and the weekly report all need something that wakes up on time. A pay-per-use Next.js app does not stay running, so it cannot do this by itself. This piece is missing from the system list.

**Recommend:** add a scheduling and queue layer on AWS (EventBridge Scheduler and SQS triggering small functions). It is pay-per-use and costs pennies at this volume.

### A4. Meta tracking needs consent under UK rules *(to confirm with legal advice)*
The Meta pixel and server events are advertising tracking. Under PECR they need the visitor's consent. The 2025 easing for simple statistics does not cover advertising. The compliance doc only says "cookie banner where needed".

This matters commercially: visitors who decline are not reported to Meta, so the ads see fewer events than really happened.

**Recommend:** a proper consent banner from day one, with our own first-party tracking (pages, form drop-off, video) designed to fit the statistics exemption where it can. franOS keeps the true numbers either way, so reports stay accurate even when Meta's are short. Adam decides the banner wording with legal advice.

### A5. Data protection paperwork is thinner than the system needs
Recording calls, analysing them with AI and scoring people is exactly the kind of processing the ICO expects a written risk assessment for. The compliance doc covers the basics but misses:
- **A data protection impact assessment (DPIA)** covering recording, AI analysis and scoring
- **The lawful basis** for each kind of processing, written down
- **A list of sub-processors** (AWS, Neon, Anthropic, Twilio, Zoom/Google, Meta) and how data sent outside the UK is covered
- **Sensitive information in calls:** people mention health, family and money. The extraction must not store health or similar details as fields
- **A human route when the form filters someone out** (Stage B): a line such as "think we've got this wrong? Email us", so the decision is never purely automatic
- **Franchise Right's own ICO registration**
- **The franchise domain:** written permission to use the client's brand name in a domain, and what happens to the domain and data when a client leaves

### A6. Check the offer before spending on the funnel
From Ali's interview, as far as the auto-transcript shows: about £250k revenue in year two at roughly 9% net, six months before the first project, and criticism of the franchisor's marketing guidance and hand-holding. The avatar is a senior person with savings who will ask hard questions about earnings and support.

franOS can find the right people and take them down the best path. It cannot make the numbers attractive. **Recommend:** before launch, get real franchisee figures and the current support package from John English, and decide what can honestly be claimed. This also protects against earnings claims that cannot be backed up.

---

## B. Tighten

### B1. The funnel A/B test will be slow
On about £4k a month, each funnel might see 5–15 good calls a month. A clear winner on cost per good call could take two to three months. **Recommend:** set the stopping rule now (for example 30 good calls in total or 10 weeks, whichever comes first), treat an unclear result as "keep Adam's funnel", and watch booked calls and show rate as early signs.

The same applies to tightening the form after 30–50 calls: with five questions, that is enough for simple rules checked against Mike's judgement, not for fine weighting.

### B2. Google Meet recordings may be harder than Zoom *(to confirm)*
Pulling recordings and transcripts from Google needs access to the consultant's Drive, which Google treats as a restricted permission. Small numbers of users can connect to an unverified app with a warning screen; beyond that Google requires a paid security assessment. **Recommend:** build Zoom first, and for Meet clients start with a simple "upload the recording" button.

### B3. A second lock on client separation
The plan relies on the app checking the client on every query. **Recommend:** also switch on row-level security in Postgres, so the database itself refuses to return another client's rows even if the app has a bug.

### B4. One client's email problems can stop everyone's
SES judges reputation per AWS account. A burst of spam complaints for one brand could pause sending for all brands. **Recommend:** separate sending identities and reputation tracking per client, automatic pause for a single brand when its complaint rate rises, and slow warm-up for every new domain. This matters more because the plan is to send a lot of emails.

### B5. Costs the table leaves out
- **AI inside franOS:** transcription and transcript analysis, a few pence per call
- **Recording storage:** small, grows over time; needs the retention rule
- **A known AWS trap:** putting the app inside a private network adds a fixed fee of roughly £30 a month. Avoid it; the database is reachable without one

None of these changes the overall picture of tens of pounds a month.

### B6. Do not set up all twelve agents on day one
The Strategist and Insights analyst have nothing to work on until leads exist, and content agents are not needed to build software. **Recommend:** start the build with the main session plus Planner, Tester and Reviewer. Bring in the content agents when Refresh's assets are being made, and the Strategist and analyst at launch. The files stay in place; they simply are not used yet.

---

## C. Holds up well
- Own build, one system for all clients, Refresh first
- Next.js, Postgres on Neon in London, AWS for email and video
- Our own booking page, form and video tracking
- Two scores (Fit and Path) and the path engine
- Launching as a call campaign, then filtering on the form
- Never using age or gender; no age-guessing from video
- The Charter and the five-line rule for every task
- Review gate and approval points

---

## D. Decisions needed from Adam
1. Accept the thin launch version (A1), or keep everything before launch?
2. Accept the reply-relay design for email (A2)?
3. Refresh Renovation's launch date
4. GitHub for the code
5. KPI dashboard: Google Sheet for now, or franOS from the start
6. Who gives legal advice on consent, the DPIA and the client agreement (A4, A5)
7. Real franchisee figures and support details from John English (A6)
