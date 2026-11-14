# Build phases

**Refresh Renovation launches 16 December 2026** on the thin launch version. Changes freeze about a week before. If the launch version is not passing its tests by the freeze, Refresh launches on the GHL template and moves over later.

## Before launch (thin version)
| Step | Built | Result |
|---|---|---|
| **0. Foundations** | GitHub, AWS account (spend cap, alerts), test and live copies, Neon database with row-level security, data model around journey events, login and roles, client settings, jobs table for timed work | Solid ground |
| **1. Capture** | Lead-first funnel pages, form (Stage A) with the consent tick, WhatsApp opt-in, Turnstile, cookie-free page stats, video tracking, Lead event from the server, leads list with timeline, Fit score v1 | Leads can sign up and are scored |
| **2. Nurture** | SES with per-client sending reputation, franchise domain (SPF/DKIM/DMARC) and warm-up, path engine, emails, link tracking, one-click unsubscribe, suppression list, bounce and complaint handling, preview page | Leads get the path |
| **3. Calls** | Booking page (short window), Zoom connection with recordings and transcripts, reminders, Schedule event, speed-to-lead alert | Leads book and talk to Mike |
| **4. Working the leads** | Simple board, "How did it go?" outcomes with BANT, basic numbers vs target, Good call and Signed events | **Refresh can launch** |

## After launch
| Step | Built |
|---|---|
| **5. Tracking extras** | Email reply relay and BCC logging, tracked phone number with click-to-call, automatic transcript extraction, Meet recording upload |
| **6. Learning** | Weekly report, avatar card updates, form tightening (Stage B), greatest hits suggestions, objection reports, application-first funnel for a set-period test |
| **7. Migration** | Import tool from GHL; move Oven Rescue, then others; GHL switched off |

## Also in scope
- **GHL feature checklist:** everything in today's franOS is either rebuilt or deliberately dropped
- **Client settings replace the Content Manager sheet**
- **Monitoring and alerts;** tested restores
- **franOS connector (MCP)** so agents can work with franOS directly, with limited keys
- **Legal pages per client;** data protection paperwork drafted by Claude for a person to check and sign
- **Mobile-friendly** screens

## Agents for the build
Planner, Tester and Reviewer to start. Content agents join when Refresh's assets are made; Strategist and Insights analyst join at launch.

## Approval points
- Adam approves each spec (plain English) before it's built
- Adam approves before anything goes live

## Open
- [ ] Who checks the legal wording and paperwork
- [ ] Real figures and support details from John English
- [ ] Refresh's content: interviews, VSL, prospectus, emails (most likely to run late)
- [ ] Official prices confirmed (doc 03)
