# Step 4 spec: working the leads (board, call outcomes, numbers)

> **History.** This spec records how this part was agreed and built, including things later changed. For how franOS works now, read `00-how-franos-works.md`.

**Status:** approved by Adam on 14 November 2026 with the suggested defaults. See Progress at the end.

> **Brand:** all (first used by Refresh Renovation)
> **Loop step:** launch, and the start of learn
> **Measure it moves:** cost per good call and cost per signing, against the brand's target
> **Expected effect:** every call ends with a recorded outcome, every lead ends as signed or not going ahead, and Adam can see at a glance whether the brand is on target
> **How we'll know:** the checks at the bottom all pass, using test leads

This is the last step before Refresh Renovation can launch. Built on Adam's computer first, like the others.

## 1. The board
One screen per brand showing every open lead as a card, in columns.

| Column | A lead is here when |
|---|---|
| **New** | They have signed up and have no call booked |
| **Call booked** | They have a call coming up |
| **Call done** | They showed up for a call |
| **Good call** | The call was recorded as a good call (see section 2) |
| **Signed** | They have signed |

- **Leads move by themselves.** The column follows what has happened: booking a call, showing up, the outcome. Nobody drags cards, so the board is always true.
- **Two things are set by hand:** Signed, and Not going ahead. Both are buttons on the lead's record.
- **A lead who did not show** goes back to New with a "missed call" label, because the next job is to rebook them.
- **Not going ahead** leads leave the board. A link shows them in a list, and any of them can be reopened.
- **Each card shows:** name, Fit score, the next step on their path, their next call if they have one, and how long they have been in the column.
- **Sorted** by Fit score, highest first, so the consultant works the best leads first.
- The existing leads list stays, for searching and sorting everyone.

## 2. "How did it go?" after every call
When a lead has shown up for a call, franOS asks the consultant six quick questions. It takes under a minute.

| Question | Answers |
|---|---|
| **Budget:** do they have the money? | Yes / No / Not sure |
| **Authority:** can they decide, and is their partner on board? | Yes / No / Not sure |
| **Need:** do they have a real reason to do this? | Yes / No / Not sure |
| **Timing:** do they want to start soon? | Yes / No / Not sure |
| **Are they the kind of person we want?** (the avatar card is shown alongside) | Yes / No |
| **What happens next?** | Second call / Sent next steps / They are thinking / Not going ahead |

Plus a box for notes.

- **franOS works out "good call" itself:** all four of budget, authority, need and timing are Yes, and they are the kind of person we want. The consultant never ticks "good call" directly, so it means the same thing every time.
- **Calls waiting for an answer are listed** at the top of the Calls tab and on the board, and the consultant gets one reminder email an hour after the call.
- **An answer can be corrected later.** The change is kept on the lead's timeline.
- A lead can have more than one call. Each call gets its own answers.

## 3. How a lead ends
Every lead ends one of two ways, so the data stays clean.

**Signed.** Set on the lead's record with the date. The emails stop (already built).

**Not going ahead.** Set on the lead's record with one reason from a fixed list, the same for every brand so brands can be compared:

| Reason |
|---|
| Does not have the money |
| Not the right time |
| Partner or family not on board |
| Not right for us (our decision) |
| Chose another franchise or business |
| Went quiet |
| Other (with a note) |

The emails stop. A lead marked Not going ahead can be reopened, which puts them back on the board.

## 4. Numbers against the target
A new Numbers tab per brand, for a chosen period: this month, last month, the last 30 days, since launch, or any dates.

**The line that matters:**

| | Count | Cost each | Target |
|---|---|---|---|
| Leads | | | |
| Calls booked | | | |
| Calls that happened (with the show rate) | | | |
| Good calls | | | |
| Signed | | | The brand's target, for example £4,000 |

- **Cost per signing is shown against the target,** green when on or under it and red when over.
- **How many move from each line to the next,** as a percentage: leads to booked calls, booked to happened, happened to good, good to signed.
- **By ad:** the same counts for each ad the leads came from, so it is clear which ads bring good calls and not only cheap leads.
- **Fit:** how many leads were good fit, and how the good-fit leads did compared with the rest.
- **Small numbers are labelled.** With fewer than about 10 in a line, franOS says "too few to judge yet" beside any percentage or cost.

**Ad spend.** There is no connection to the Meta ad account yet, so spend is typed in: one figure per month per brand, on the Numbers tab. franOS spreads it across the days of the month to work out costs for any period. Pulling spend from Meta automatically comes when the Meta account is connected.

## 5. Telling Meta
- **Good call** is recorded when franOS works one out, once per lead.
- **Signed** is recorded when a lead is marked signed, with the franchise fee as its value.
- Both are background events: the ads keep optimising on Schedule, and nothing optimises on these.
- On this computer they are only recorded, never sent. They go to Meta once the account is connected and Adam approves go-live.

## Who can do what
| | Owner | Consultant | Client |
|---|---|---|---|
| See the board and the numbers | Yes | Yes | Yes |
| Answer "How did it go?" | Yes | Yes | No |
| Mark Signed or Not going ahead, reopen | Yes | Yes | No |
| Type in ad spend, set the franchise fee | Yes | No | No |

## Not in this step
- Reading BANT, objections and questions out of the transcript automatically (Step 5). In this step the consultant answers the questions.
- The weekly report and the Strategist's ranked plan (Step 6)
- Changing the Fit score from outcomes (Step 6)
- Pulling ad spend from Meta automatically
- Dragging cards between columns
- Lead assignment between several consultants (later list)

## Checks before it counts as done
- [ ] A new lead appears in New; booking a call moves them to Call booked; showing up moves them to Call done
- [ ] A no-show goes back to New with the "missed call" label
- [ ] All four BANT answers Yes plus "the kind of person we want" makes a good call; anything else does not
- [ ] A call with no answers yet is listed as waiting, and the consultant gets one reminder, once
- [ ] Correcting an answer updates the good-call result and is kept on the timeline
- [ ] Marking Signed moves the lead to Signed and stops their emails
- [ ] Not going ahead needs a reason, removes the lead from the board and stops their emails; reopening brings them back
- [ ] One Good call event and one Signed event are recorded per lead, and nothing is sent to Meta from this computer
- [ ] The numbers for a period match the leads, calls and outcomes in that period, counted by hand in a test
- [ ] Cost per signing uses the spend typed in, and shows green or red against the target
- [ ] The by-ad table adds up to the totals
- [ ] A consultant can answer outcomes but cannot change spend; the client role can only read
- [ ] One brand's board, outcomes and numbers are invisible to another brand

## For Adam to confirm
1. **The board columns,** and that leads move by themselves instead of being dragged. OK?
2. **The six questions after a call.** Anything to add or drop?
3. **The reasons for Not going ahead.** Anything to add or reword?
4. **Ad spend typed in once a month** until Meta is connected. OK, or would you want it weekly?
5. **The franchise fee for the Signed event.** The avatar card says about £35,000 for Refresh. Is that the figure to use?
6. **Who sees what:** Paul (client) sees the board and the numbers, including cost per signing, but cannot change anything. OK?

Adam approved all six points as suggested on 14 November 2026. The franchise fee (point 5) was not confirmed as a figure, so it is a setting on the Numbers tab and is empty until typed in.

## Progress
**14 Nov 2026 — built on Adam's computer.** 106 automatic tests pass (18 for this step). Walked through in a browser with a test lead on a separate test database, which was deleted afterwards.

Working:
- **Board tab:** five columns, leads placed by what has happened, sorted by Fit. "Missed call" and "How did it go?" labels. Not going ahead leads are in their own list and can be reopened
- **"How did it go?"** on the lead's record under each call they showed up to: budget, authority, need, timing, the kind of person we want, what happens next, notes. franOS works out good call. Answers can be corrected and both versions stay on the timeline
- **Calls waiting for an answer** are listed on the Board and Calls tabs, and the consultant gets one reminder email an hour after the call
- **Signed and Not going ahead** on the lead's record, with the fixed list of reasons. Both stop the emails. Reopen puts the lead back
- **Good call and Signed events** recorded once per lead, Signed with the franchise fee as its value. Nothing is sent to Meta
- **Numbers tab:** counts, cost each, how many move from each line to the next, cost per signing in green or red against the target, by ad, by Fit score, "too few to judge yet" under 10
- **Ad spend typed in per month,** spread over the days of the month for any period. Franchise fee setting
- The client role can read all of it and change none of it. A consultant cannot change spend. One brand's board, outcomes and spend are invisible to another

Different from the spec:
- **The avatar card is not shown beside "the kind of person we want".** The avatar card is a document, not yet stored in franOS. The brand's "this is for you if" list is shown there instead
- **"How long in the column" is shown as a simpler line:** when they signed up, when the call was, or when they signed
- **The franchise fee has no default.** Type it in on the Numbers tab

Not done yet in Step 4:
- **Pulling ad spend from Meta.** Typed in for now
- **A call counts in the numbers on the day it was held.** A test call "pretended" before its booked time shows up in the numbers once that day arrives, not straight away
- **Storing the avatar card in franOS** so it can sit beside the question
- **Browser tests that run automatically.** The walk-through was by hand

**14 Nov 2026 — reworked after Adam tried it.** 108 automatic tests pass. Sections 1 and 3 above describe the first version; this is how it works now.

- **The board is an opportunity board.** It only shows leads worth working: a Fit score of 70 or more, or anyone who has booked a call. Everyone else stays in the Leads list
- **The columns are Adam's stages:** Good fit, Call scheduled, Interested, Closing, Signed. Each column says what it means underneath its name
- **Closing is set by hand** with a "Move to Closing" button, for someone who is more than interested and needs regular follow-up. Everything else still moves by itself
- **"Good call" is a label on the card,** not a column. It is still counted on the Numbers tab
- **Clicking a card opens the lead in a pop-up** over the board, closed with the X. It has three tabs: Opportunity (what to do next, calls, what they have seen, notes, and how it ends), Form (their answers, Fit score and consent) and Activity (everything that has happened)
- **One panel, two places.** The pop-up and the lead's own page are the same panel, so there is one place to change anything
- **Notes** can be added to any lead and show in Activity
- **"Not going ahead" is tucked behind a button** and asks for the reason only when pressed
- **The call questions keep what was chosen** if a save is incomplete
- The board no longer scrolls sideways

