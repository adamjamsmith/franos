# How franOS works today

**This is the current picture.** Written 14 November 2026, last updated 15 November 2026. If this and a numbered spec disagree, this is right: the specs (docs 10, 12 to 16, and 19) are the history of how each part was agreed and built, including things later changed. Decisions are in `02-decisions-log.md`; what is left to do is in `17-plan-to-launch.md`.

franOS runs on Adam's computer only. Nothing is live. Email goes to a test mailbox, a stand-in plays Zoom, and Meta events are recorded but not sent.

## What it is
One system for every brand. Each brand has its own public pages, form, emails, calls and leads, and nobody in one brand can see another's. People log in with an emailed code plus an authenticator code. An owner sees every brand; a client or consultant sees their own.

## What a lead goes through
1. **Landing page.** Headline, requirements, testimonials and the sign-up form.
2. **Form.** Contact details, the avatar questions as tick-one circles, one required consent tick. A mistake keeps everything typed and marks the wrong box red. The answers give a **Fit score** out of 100. Someone who completes the form but misses a must-have answer sees "Thanks for your interest" and goes no further (see The form, below).
3. **Thank-you page.** Text, the introduction video, and Schedule a call.
4. **Prospectus email,** at once.
5. **Emails,** one a day at most (see below).
6. **Booking.** A calendar like Calendly: pick a day, pick a time, Next, check name and email, Book call. Only people who have filled in the form can book.
7. **The call,** on Zoom, recorded.
8. **Next steps and Questions** pages.
9. **Signed,** or not going ahead.

franOS records every step on the lead: pages opened, video watched and how far, emails sent, opened and clicked, calls, and what happened on them. From that it knows each lead's **path** (introduction video, prospectus, call, Next steps, Questions) and their **next step**: the first of prospectus, call, Next steps, Questions they have not done.

## The form
The owner sets the questions under **Settings > Form**. It is one tight table, laid out from Adam's sketch: a row per question that opens to show its answers; each answer has a score (Great, OK or Poor) and an asterisk that goes green when it is a must-have; rows are dragged to reorder; the last row adds a new one. Changes are held on screen until Save is pressed.

- **Each answer is marked Great, OK or Poor.** Great counts 2, OK 1, Poor 0. The Fit score is what a lead got out of the most they could get, with every question counting the same. A question only counts if its answers carry different marks: if every answer is marked the same, it cannot tell leads apart, so it is for information only.
- **An answer can be a must-have.** A lead has to pick one of a question's must-have answers. Someone who doesn't is saved as **Didn't qualify**: no thank-you page, no booking, no emails, no Lead event to Meta, not on the board. They show in the Leads list with a label, and Numbers counts them separately by ad. A new brand has no must-haves.
- **It is decided once,** at the first sign-up. Changing the must-haves later, or filling the form in again, does not move anyone from one side to the other.
- **Changing a mark works every lead's Fit score out again.** A question a lead was never asked is left out of their score, so adding a question does not pull old leads down.
- **A removed question goes to the bin** with its answers kept, and can be restored. The same goes for an answer that leads have picked; an answer nobody has picked is simply deleted.
- **A new question is not on the public form** until it has at least two answers. Until then its number shows in amber.

## Emails
**No lead gets more than one email a day,** apart from emails about a call they have booked. Each day the most relevant one goes:

1. **A reaction,** if they just did something: read the prospectus, watched half a testimonial ("Want to talk to this person?"), or missed a call. Sent 10 minutes later, once each.
2. **A nudge,** if they are stuck: prospectus not opened, or no call booked. After 3 days, then once more 7 days later, then they stop.
3. **Otherwise the next sequence email.** One a day, in the order on the Emails tab.

Every email's call to action follows the lead's next step. Nothing goes between 9pm and 8am except the prospectus email at sign-up. Nothing goes to anyone who has unsubscribed, signed, is not going ahead, or didn't qualify.

**Call emails** are separate: on booking, then 3 days, 1 day, 12 hours, 1 hour and 10 minutes before. Someone who has not read the prospectus is pointed at it; someone who has is pointed at Next steps and Questions.

**Layouts.** Five, chosen per email: Header, Header + video, Header + owner photo, No header, and Personal (plain, as if typed by the consultant). Reactions and nudges are Personal. A new brand starts with 24 named sequence emails (VT1 Short, VT2 Short, Funding...) with placeholder wording.

## Working the leads
**The board** shows opportunities only: leads with a Fit score of 70 or more, and anyone who has booked a call. Leads who didn't qualify are never on it.

| Column | Means | How a lead gets there |
|---|---|---|
| Good fit | Scored well, no call booked. Worth calling | By itself |
| Call scheduled | Has a call coming up | By itself |
| Interested | Has had a call and is still in play | By itself |
| Closing | More than interested, needs regular follow-up | Moved by hand |
| Signed | Signed | Marked by hand |

Clicking a card opens the lead in a pop-up with three tabs: **Opportunity** (what to do next, calls, what they have seen, notes, how it ends), **Form** (answers, Fit score, consent) and **Activity** (everything that has happened).

**After every call** the consultant answers six questions: budget, authority, need, timing, whether they are the kind of person we want, and what happens next. franOS works out **good call** from them: all four yes, and the right kind of person. A lead ends as **Signed** or **Not going ahead** with a reason from a fixed list.

**A new good-fit lead** triggers a "call now" email to the consultant, between 8am and 8pm.

## The numbers
For any period: leads, calls booked, calls that happened (with show rate), good calls and signings, what each cost, and cost per signing in green or red against the brand's target. Broken down by ad and by Fit score. Ad spend is typed in per month.

## Where things are on screen
| Menu | Screen | What it is for |
|---|---|---|
| **Work the leads** | Board | Opportunities by stage |
| | Leads | Everyone who has signed up |
| | Calls | Upcoming and past calls, show rate |
| **How it is going** | Numbers | Against target; Form drop-off inside it |
| **Set it up** | Emails | Every email, in five folders |
| | Settings | Brand and pages · Form · Calls · Emails · People |

Every setting lives under Settings. Ad spend is the one exception: it is on Numbers, because it is typed in monthly alongside the figures it feeds.

"View site" in the top bar opens the brand's public page. Logged in, the public pages show a strip to switch which lead you are viewing as.

## What is a stand-in today
| Real thing | Today |
|---|---|
| Email | A test mailbox at `/dev/mailbox` |
| Zoom | Made-up meeting links; "Pretend this call has happened" adds a sample recording and transcript |
| Meta | Lead, Schedule, Good call and Signed are recorded, never sent |
| The consultant's calendar | Working hours set in franOS; it cannot see other appointments |
| The internet | Runs at `localhost:3000` on Adam's computer |

## How it is checked
155 automatic tests (`npm test` in the `web` folder) cover the rules above, including that one brand cannot see another's data. Each step was also walked through by hand in a browser on a throwaway database.
