# System and costs

## The pieces
| Piece | What it does | Built with |
|---|---|---|
| **App** | Pages, forms, automations, CRM screens, API | Next.js on AWS (pay per use) |
| **Database** | Leads, events, consent, calls, settings for every client | Postgres on Neon (London) |
| **Pages and forms** | Landing page, VSL, video pages, prospectus, next steps, questions, booking, application form | Inside the app, per-client branding |
| **Email** | Chains, reminders; reply relay and logging (after launch) | Amazon SES + franchise domain per client |
| **Timed work** | Email waits, reminders, weekly report | Jobs table in the database, checked every minute |
| **Calendar** | Booking page on the consultant's calendar | Own build + Google/Outlook calendar API |
| **Video calls** | Recording, transcript, attendance | Zoom or Google Meet API (client's choice) |
| **Phone** | Tracked number, click-to-call, recording, transcript | Twilio-style provider |
| **Videos** | Testimonials, VSL; watch tracking | S3 + CloudFront; own player |
| **Meta** | Browser pixel + server events (Lead, Schedule; Good call and Signed in the background) | Meta Conversions API, direct |
| **Login** | Owner / Client / Consultant roles, two-step login, audit log | Auth library inside the app |
| **Agent connector** | Lets Claude agents use franOS directly | franOS MCP server with limited keys |
| **Spam protection** | Forms and booking | Cloudflare Turnstile (free) |

## Rough monthly cost, first few clients
Estimates from third-party price guides. **Confirm on official pages before signing up.**

| Piece | Cost |
|---|---|
| App on AWS | £0–5 |
| Database (Neon) | £0 while building, ~£5–15 live |
| Email (SES) | £1–5 (30,000 emails ≈ £2.50) |
| Videos (CloudFront) | ~£0 (inside the free 1 TB) |
| File storage | < £1 |
| Phone, per client | ~£5–15 |
| Calendar, Meta, Turnstile | Free |
| AI inside franOS (transcription, analysis) | A few pence per call |
| Domains | ~£10/year each |
| Zoom Pro / Workspace | Paid by the client if they don't already have it |

**Total: about £5–25/month to start** (plus phone per client), perhaps £30–60 with ten busy clients. New AWS accounts get $100–200 of credits. The real cost is building it.

## To confirm before building
- [ ] Official prices: Neon, AWS hosting, Twilio UK numbers and minutes, SES plans
- [ ] Which AWS region receives email (London may not; Ireland is fine under UK GDPR)
- [ ] Cookie rules for simple analytics after the 2025 changes
