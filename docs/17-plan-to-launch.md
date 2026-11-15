# Plan to launch

Written 14 November 2026. Refresh Renovation launches **16 December 2026**. Changes freeze about **9 December**; if franOS v2 is not passing its tests by then, Refresh launches on the GoHighLevel template and moves over later (decision 50).

## Where things stand
All four launch steps run on Adam's computer: capture, emails, calls, and working the leads. Nothing is live. Email goes to a test mailbox, a stand-in plays Zoom, and Meta events are recorded but not sent.

## What is left, in order

### A. Finish the software (Claude, on Adam's computer)
| # | Job | Needs from Adam |
|---|---|---|
| A1 | ~~One email a day: reactions and nudges, Emails tab in folders~~ **Done 14 Nov** (spec 16) | |
| A2 | ~~Call reminders up to six, in two versions~~ **Done 14 Nov** | |
| A3 | ~~Email layouts and the named starter library~~ **Done 14 Nov** (docs/18). The real wording is the copywriter's job (D4), not copied from GoHighLevel | |
| A4 | **Emails on screen:** add, delete and reorder are done. Still to do: links to other websites, and editing the call emails | Nothing |
| A5 | ~~Form questions on screen: edit the questions, mark answers Great, OK or Poor, set must-haves~~ **Done 15 Nov** (spec 19) | |
| A6 | **Layouts and templates rework** of the public pages, once the flow is agreed (decision 55) | A session together on how they should look |

### B. Accounts only Adam can open (start now: some take days)
From `11-your-setup-checklist.md`. These are the critical path, because email approval and warming up a new email domain cannot be rushed.

| # | Account | Why it cannot wait |
|---|---|---|
| B1 | **Franchise domain** for Refresh | Everything public hangs off it, and the email domain must warm up for 2 to 3 weeks before launch |
| B2 | **AWS account** (with a spend cap) | Hosting, email and video. Amazon's approval to send real email takes a few days |
| B3 | **GitHub and Neon** | Where the code and the live database are kept |
| B4 | **Zoom** (the account Mike's calls are on) | Real meeting links, recordings and transcripts |
| B5 | **Meta** dataset and ad account access | Lead and Schedule events; ad spend |
| B6 | **Who checks the legal wording** | Consent tick, privacy notice, call recording, "I saw you opened..." emails |
| B7 | **John English:** real figures, franchise fee, support details | Needed for the prospectus, the form and the Signed event value |

### C. Going live (Claude, as each account arrives)
| # | Job | Depends on |
|---|---|---|
| C1 | Move franOS from this computer to AWS and Neon, with test and live copies, backups and alerts | B2, B3 |
| C2 | Real email through Amazon SES: sending, bounces, spam complaints, and closing the "could send twice" gap | B1, B2 |
| C3 | Start the email warm-up at a low daily limit | C2 |
| C4 | Connect the real Zoom; keep recordings in franOS's own storage | B4, C1 |
| C5 | Connect Mike's calendar so franOS sees his other appointments | Mike's Google or Microsoft account |
| C6 | Send Lead and Schedule to Meta; Good call and Signed in the background | B5 |
| C7 | Switch on Cloudflare Turnstile on the form | B1 |

### D. Content (Adam, with the content agents)
| # | Piece | Note |
|---|---|---|
| D1 | Form questions and Fit points | From the avatar card |
| D2 | Prospectus, Next steps, Questions documents | |
| D3 | Introduction video (VSL) and testimonial videos | Most likely to run late |
| D4 | About 20 sequence emails, the chasers and the reminders | Copywriter agent, then the review gate |
| D5 | Landing page and thank-you wording; brand colour and logo | |
| D6 | Privacy notice and consent wording, after the legal check | B6 |

### E. Test and launch
| # | Step | When |
|---|---|---|
| E1 | **Launch test:** six test leads, one per path (ideal, avatar, books, arrives from an ad, low fit, form check), as in the GoHighLevel launch protocol | Once C and D are in |
| E2 | **Freeze and go/no-go** | About 9 December |
| E3 | **Adam approves go-live** | Before 16 December |
| E4 | **Launch** as a Call campaign optimising on Schedule | 16 December |

## The two things most likely to make it late
1. **The email domain.** A new domain has to be warmed up slowly. If the domain and AWS are not open this week, launch-day email volume will be limited.
2. **The videos.** The VSL and testimonials are the longest content job.

## Also outstanding
- **Nothing is saved in version history yet.** Every step so far exists only as files on this computer. A first save (commit) costs nothing and needs no account; an off-computer copy needs GitHub (B3).
