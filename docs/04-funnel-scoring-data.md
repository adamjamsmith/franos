# Funnel, scoring and data

## The funnel
**At launch — lead first (Adam's, proven):**
Ad → form → thank-you page (booking first, VSL) → prospectus with booking on the page → emails → call → next steps and questions

**To test later — application first (Hormozi):**
Ad → landing page with VSL → application form → calendar straight away → emails → call

**No A/B split.** Run one funnel for a set period, change it, and compare the periods on **cost per good call**. Periods differ in other ways (time of year, ad fatigue), so treat the result as a guide.

**A good call** = the lead matches the avatar card **and** passes BANT on the call: **B**udget (has the money), **A**uthority (can decide, partner on board), **N**eed (a real reason to do this), **T**iming (wants to start soon). The consultant records the four answers after each call; franOS works out good call from them.

## Hormozi additions (both funnels)
- Requirements stated in ads and on the page
- VSL opens with the avatar's situation and pains
- **Speed-to-lead alert:** "new good-fit lead, call now", with click-to-call
- **Booking window:** next few days only
- **BANT** (budget, authority, need, timing) captured on every call outcome
- **Show rate** on the dashboard; reminders from the Call Chain

## The form
- **Stage A (launch):** one simple long form, as on today's site. Asks the avatar questions (timing first) but doesn't filter. One required consent tick box, with small-print wording that covers contact and sharing with Meta (exact wording saved; legal check needed); **WhatsApp opt-in tick box**; UTMs captured; Cloudflare Turnstile; anonymous question-by-question drop-off tracking (never what people typed).
- **Stage B (after ~30–50 calls with outcomes):** filter on the answers that predict good calls. Qualified people get the booking step. Others get a polite "not right now", plus nurture emails. Adam approves each tightening.
- Multi-step versions are an A/B test for later.

## Scoring: two scores
| Score | Question it answers | Built from |
|---|---|---|
| **Fit** (0–100) | Who are they, compared with the avatar card? | Form answers, facts from calls (occupation, savings, team experience…), BANT. Never age or gender |
| **Path** | What have they done? | Path steps completed (VSL, prospectus, call, next steps, questions, testimonials watched) + a **call-ready** flag |

Fit starts as clear rules from the avatar card and is re-weighted as outcomes come in. Every score shows **why**.

## The path engine
- Path v1 = Adam's known path: **VSL → prospectus → call → next steps → questions.** (Good-avatar leads who did these and wanted to start in 0–3 months: 7 of 11 went ahead, from ~500 leads.)
- After sign-up, franOS sends **the next missing piece**, plus plenty of touch-point emails.
- **Greatest hits:** on each lead, the 2–3 pieces that best answer their objections; the consultant sends them with one tap.

## Meta events
| Event | When | Use |
|---|---|---|
| Lead | Sign-up | Sent from the server after the consent tick. No Meta pixel loads before submit |
| **Schedule** | Booked call | **What the ads optimise on** |
| Good call | Transcript + consultant outcome say ideal and serious | Sent in the background |
| Signed | Signed | Sent in the background, value = franchise fee |

Meta works best with ~50 optimisation events a week per ad set, so we optimise on bookings, not good calls. Tightening the form makes every booking a qualified booking, without telling Meta anything changed.

## What we track (everything, timestamped, per lead)
- Pages visited (cookie-free stats before sign-up; linked to the person from sign-up onwards)
- Form answers and drop-off
- Every email: sent, opened (rough guide), clicked
- Every inbound and outbound email on the franchise domain (relay method; BCC logging address for new emails from the consultant's own inbox)
- Videos: played, % watched, skipped, rewatched
- Bookings, shows, no-shows (from call attendance)
- Calls: recording, transcript, length; extracted objections, questions, motivations, facts, with quote and timestamp
- Consultant outcome and BANT
- Outcome: signed or not, and why

## Clean-data rules
1. One record per person (matched by email and phone)
2. Everything timestamped
3. Keep the original (recording, transcript, answers) and the extracted data
4. The same categories for every client, so brands can be compared
5. Every lead ends with an outcome
