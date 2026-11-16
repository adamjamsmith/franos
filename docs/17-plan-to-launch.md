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
| A6 | ~~Layouts and templates rework of the public pages~~ **Done 15 Nov:** homepage, thank-you and video pages on one layout (decisions 92 and 93). The prospectus, Next steps and Questions pages are unchanged | |

### B. Accounts only Adam can open (start now: some take days)
From `11-your-setup-checklist.md`. These are the critical path, because email approval and warming up a new email domain cannot be rushed.

| # | Account | Why it cannot wait |
|---|---|---|
| B1 | ~~Franchise domain for Refresh~~ **For now: `refresh.franchiseright.co.uk`** (decision 101). The domain is at Namecheap. Sending address created and verified in AWS 15 Nov (three lines added in Namecheap). **Request to lift test mode sent to Amazon 15 Nov, awaiting their reply by email to Adam** **16 Nov (decision 112):** the team signs in at `crm.franchiseright.co.uk`. Still to do: Adam registers Refresh's own domain; then franOS is built to give each brand its own public address, the domain is verified for sending, and warm-up starts on it | Everything public hangs off it, and the email address must warm up for 2 to 3 weeks before launch |
| B2 | ~~AWS account~~ **Open 15 Nov:** project `franos`, Stockholm, on the free plan (decision 100). Claude is connected through Adam's own login, 12 hours at a time. Still to do: move to the paid plan and set the spend limit before going live | Hosting, email and video. Email is in Amazon's test mode (200 a day, verified addresses only) until they approve a request |
| B3 | ~~GitHub and Neon~~ **Open 15 Nov.** GitHub holds the code. **Neon connected 15 Nov:** London, its address encrypted in AWS (`/franos/db`), tables created and the data from Adam's computer copied in. franOS was run against it and worked | Where the code and the live database are kept |
| B4 | ~~Zoom~~ **Open 15 Nov:** Franchise Right's own account (free plan), with the franos app created and its codes encrypted in AWS Parameter Store (decisions 102 and 103). **Pro from 16 Nov,** with the recording settings set and tested the same day: two test meetings recorded, giving a speaker-view video, a combined sound file, a sound file per person and a transcript. Still to do: add the consultant as a user | Real meeting links, recordings and transcripts |
| B5 | ~~Meta~~ **Test dataset open 15 Nov** under Franchise Right ("franOS test"), with its token encrypted in AWS. Still to do per brand: its own dataset, and the client adding Franchise Right as a partner on their ad account and Page | Lead and Schedule events; ad spend |
| B6 | ~~Who checks the legal wording~~ **Decided 15 Nov (decision 110):** Claude drafts, Adam signs off, no lawyer for now. Draft 1 is `docs/20-legal-wording.md`. Adam's decisions made 16 Nov (decision 111). Still to do: each brand's company details, loading the notice into franOS (D6), building timed deletion, then the data agreement with each client and the risk assessment | Consent tick, privacy notice, call recording, "I saw you opened..." emails |
| B7 | **Paul English:** real figures, franchise fee, support details | Needed for the prospectus, the form and the Signed event value |

### C. Going live (Claude, as each account arrives)
| # | Job | Depends on |
|---|---|---|
| C1 | Move franOS from this computer to AWS and Neon, with test and live copies, backups and alerts. **Server created 15 Nov (decision 107):** Lightsail `franos`, 2 GB, Stockholm, fixed address `16.192.105.23`, running franOS on the Neon database. **Answers only to Adam's own internet connection** until he approves opening it; the rule is in the server's web server settings (`/etc/caddy/Caddyfile`), and the one exception is `/api/ses`, which anyone can reach but which only acts on messages Amazon signed. If Adam's connection's address changes, that file and the firewall rule for the admin door need updating. Update it with `bash scripts/server-deploy.sh` from the `web` folder. **Web address and padlock on 15 Nov:** `https://refresh.franchiseright.co.uk` (the certificate renews by itself; port 80 is open to everyone only for that and for redirecting to the padlock). Adam signed in on the server 15 Nov (two-step set up afresh there, because the server has its own secret). **Backups and alerts on 15 Nov:** a full database copy every night at 02:30 UTC to private storage (`franos-backups-801911726531`, kept 35 days), a daily snapshot of the server (last 7 kept), an email to Adam if franOS has not answered for about six minutes or the nightly backup fails, and an Amazon alarm if the server itself stops. Tested: a backup ran and the not-answering and back-again emails were sent. **Restore rehearsed 15 Nov:** the stored backup was loaded into an empty scratch database on Neon; every table matched the live one, row for row, with all 40 row locks in place (`scripts/server/franos-restore-test.sh`). Still to do: a separate test copy of franOS. The test leads copied to Neon must be cleared before launch | B2, B3 |
| C1a | ~~Switch the media store to AWS file storage~~ **Held back 15 Nov.** Uploads already work on the server: files are kept on its own disk (51 GB free), served by franOS in the pieces a video player asks for, and included in the daily server snapshot. Nothing had been uploaded locally, so there was nothing to copy. Moving files to Amazon storage with video served from Amazon's network is on the later list, for when video traffic or file volume calls for it | B2, C1 |
| C2 | Real email through Amazon SES: sending, bounces, spam complaints, and closing the "could send twice" gap. **Sending built 15 Nov:** the server sends through SES with a send-only key (`franos-mailer`, stored encrypted at `/franos/ses`); a test email from the server was accepted. Sign-in codes come from `login@refresh.franchiseright.co.uk`. Amazon is still in test mode, so only verified addresses receive anything; Adam's sign-in address is awaiting his click on Amazon's link. Each brand needs a real From address on the verified domain before its emails will go. **Bounce and complaint reports connected 15 Nov:** topic `franos-email`, configuration set `franos` (the default for the sending domain), posting to `/api/ses`. Tested with Amazon's own test addresses: a real bounce and a real complaint each stopped a test lead. **Bounce and complaint handling built 15 Nov** (decision 106), tested against pretend reports. Still to do once franOS is hosted, and before any real email goes out: create the topic in AWS, point it at `/api/ses`, set `FRANOS_SES_TOPIC_ARN`, and send to Amazon's test bounce and complaint addresses to see a lead stopped | B1, B2 |
| C3 | Start the email warm-up at a low daily limit | C2 |
| C4 | **Zoom connected 15 Nov:** booking, moving and cancelling a call create, move and delete a real Zoom meeting, and attendance is read back afterwards (tested on Adam's computer). Still to do: collect recordings and transcripts once on Pro, with a later second look because Zoom can take a while to process them; keep the recordings in franOS's own storage; receive Zoom's "recording ready" message once franOS is hosted; make the brand's consultant the host | B4, C1 |
| C5 | Connect Mike's calendar so franOS sees his other appointments | Mike's Google or Microsoft account |
| C6 | **Meta, test mode only, built 15 Nov:** server events (Lead and Schedule, both as website events), the ad's click code kept at sign-up and sent with every event, and the pixel on the pages after sign-up only (decisions 108 and 109). Checked on Adam's computer: a new visitor's landing page had no pixel and no Meta cookies; after signing up the pixel loaded and reported the page view and the sign-up. Still to do: the consent and privacy wording through the legal check (B6); each brand's own dataset; switching each brand to live at go-live with Adam's approval | B5 |
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
