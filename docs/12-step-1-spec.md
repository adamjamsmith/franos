# Step 1 spec: capture (the pages and sign-up form)

> **History.** This spec records how this part was agreed and built, including things later changed. For how franOS works now, read `00-how-franos-works.md`.

**Status:** approved by Adam on 14 November 2026. Built on Adam's computer; see Progress at the end.

> **Brand:** all (first used by Refresh Renovation)
> **Loop step:** launch
> **Measure it moves:** cost per booked call and cost per good call (it creates the leads and their Fit score)
> **Expected effect:** leads can sign up, are scored against the avatar card, and every step they take is recorded
> **How we'll know:** the checks at the bottom all pass, using test leads

Built on Adam's computer first, like the foundations. Placeholder wording and a placeholder video stand in until Refresh's real content exists.

## What a lead sees (lead-first funnel)
| Page | What's on it |
|---|---|
| **Landing page** | Headline and sub-headline that speak to the avatar, the requirements stated plainly, testimonial videos, and the sign-up form |
| **Thank-you page** | "Thanks, [first name]", the VSL, a button to the prospectus. The booking section is added in Step 3 |
| **Prospectus page** | The prospectus shown on the page, with a download button |
| **Video pages** | One page per testimonial video, with the other videos listed underneath |
| **Next steps and Questions pages** | The same layout as the prospectus page, for those two documents |
| **Privacy page** | The privacy notice (placeholder text until the legal check) |

Each brand's pages use its own logo, colours and wording. On this computer they are reached at a local address per brand; once live, at the brand's own domain.

## The sign-up form (Stage A: asks, does not filter)
One long form, as on today's site.

| # | Question | Answers |
|---|---|---|
| 1 | First name, last name, email, mobile | Typed |
| 2 | Postcode or town | Typed |
| 3 | When would you like to start? | 0–3 months · 3–6 months · 6–12 months · Just looking |
| 4 | What do you do now? | Own or run a business · Senior manager or director · Manager · Employed, not managing · Self-employed trade · Not working at the moment |
| 5 | Have you run a business, or managed a team or budget? | Yes, run a business · Yes, managed a team or budget · No |
| 6 | Do you have the investment plus six months of living costs available? | Yes · Most of it, would need some funding · No, would need full funding |
| 7 | Would you build a team, or do the work yourself? | Build and manage a team · Do the work myself · Not sure yet |
| 8 | What's your connection to property? | Landlord or investor · Renovated my own home · Interested in homes and design · None |
| 9 | Why are you looking at a franchise now? | Typed, optional |

Questions 4–8 are Refresh Renovation's, from its avatar card. Each brand has its own set, edited in Settings. Question 3 (timing) is asked by every brand.

**Also on the form:**
- **One required consent tick box**, with small print covering contact by email and phone, call recording and analysis, and sharing details with Meta to measure advertising. The exact wording shown is saved with the lead. *Draft wording; needs the legal check.*
- **An optional WhatsApp tick box**, for later use.
- **Spam protection** (Cloudflare Turnstile). On this computer it runs in Cloudflare's test mode.
- **The ad they came from** is captured from the link (campaign, ad set, ad).

## Fit score, version 1
A score from 0 to 100 for how closely the lead matches the avatar card. Clear rules to start; re-weighted when real outcomes come in. Never uses age or gender.

| Answer | Points |
|---|---|
| **Timing:** 0–3 months 25 · 3–6 months 15 · 6–12 months 5 · Just looking 0 | up to 25 |
| **Experience:** run a business 25 · managed a team or budget 20 · no 0 | up to 25 |
| **Money:** yes 25 · most of it 15 · needs full funding 0 | up to 25 |
| **Team:** build a team 15 · not sure 5 · do the work myself 0 | up to 15 |
| **Property:** landlord or own renovation 10 · interested 5 · none 0 | up to 10 |

Every lead's page shows the score and the answers behind it. The weights live in the brand's settings, so they can change without rebuilding.

## What gets recorded
- **Every sign-up:** the answers, the consent wording and time, the ad, and a Fit score
- **Every page a lead opens after signing up,** with the time
- **Before sign-up:** page views and how far people get through the form, counted without cookies and without storing what they typed
- **Videos:** who pressed play, how far they watched, where they stopped
- **Prospectus:** opened, downloaded

## What you see in franOS
- **Leads list:** name, Fit score, timing, the ad, when they signed up; sortable by Fit
- **A lead's page:** their answers, the score and why, and a timeline of everything they have done
- **Form drop-off:** how many people saw the form, started it, reached each question and submitted
- **Settings, new sections:** page wording, logo and colours, videos, documents, form questions and Fit weights

## Meta
- No Meta pixel loads before the form is submitted.
- On submit, franOS prepares the **Lead** event to send from the server. On this computer it is written to a log you can read and is not sent. It is switched on when the brand's Meta dataset and token are added.

## Not in this step
Emails (Step 2), booking and Zoom (Step 3), the board and call outcomes (Step 4), form filtering (Stage B, after launch), hosting on AWS and real video hosting.

## Checks before it counts as done
- [ ] A test lead can sign up on a phone-sized screen and a laptop, and lands on the thank-you page
- [ ] The lead appears in the right brand's list, and in no other brand's
- [ ] The form cannot be submitted without the consent tick, and the saved consent matches the wording shown
- [ ] The same email signing up twice updates one lead; it does not create two
- [ ] Six test leads covering the scoring range get the expected Fit scores
- [ ] The ad details on the link are saved on the lead
- [ ] Watching part of a video records how far it was watched, on the right lead
- [ ] Opening and downloading the prospectus appear on the lead's timeline
- [ ] Form drop-off counts match a scripted run of visitors
- [ ] Nothing is stored in the visitor's browser before they submit the form
- [ ] The Lead event is logged once per sign-up, never twice
- [ ] A submission that fails the spam check is rejected
- [ ] A consultant can see leads but cannot change form questions or Fit weights

## For Adam to confirm
1. **The form questions and answer options** above. Change, add or remove any.
2. **The Fit points.** Is timing, experience and money at 25 each about right?
3. **The pages.** Anything on today's site that is missing here?

## Progress
**14 Nov 2026 — built on Adam's computer.** 45 automatic tests pass. Walked through in a browser with a test lead on a separate test database.

Working:
- Landing page, sign-up form, thank-you page with the introduction video, prospectus / next steps / questions pages with download, video pages, privacy page
- Sign-up creates one lead per email per brand, with answers, Fit score and its reasons, the ad, and the consent wording
- A lead's timeline: sign-up, pages opened, video progress (start, 25, 50, 75, 95, end), documents opened and downloaded
- Leads list (newest or best fit first), lead page, form drop-off page
- Settings: public page wording, colour, videos, documents, consent wording
- The Lead event is logged once per lead and not sent
- Nothing is stored in the visitor's browser before they submit (checked: no cookies, no local storage)
- Phone-width layout has no sideways scrolling

Not done yet in Step 1:
- **Changing form questions and Fit points from the Settings screen.** They are shown there for reference; changes are made in code for now
- **Cloudflare Turnstile is not switched on.** The hidden trap field is active. Turnstile needs keys from a Cloudflare account, and has not been tried
- **Page-view counts before sign-up** are recorded but have no screen yet
- **Each brand's own domain.** Public pages are at `/site/<brand>` on this computer
- **Real video hosting.** The placeholder video is a local file
- **Browser tests that run automatically.** The walk-through was by hand
- The check "works on a phone" was done at phone width in a desktop browser, not on a real phone
