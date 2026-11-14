# One email a day: reactions and nudges (an add-on to the emails)

> **History.** This spec records how this part was agreed and built, including things later changed. For how franOS works now, read `00-how-franos-works.md`.

**Status:** approved by Adam on 14 November 2026 and built on his computer. See Progress at the end. This replaces the two earlier drafts of this spec, including the daily chasers copied from today's franOS.

> **Brand:** all (first used by Refresh Renovation)
> **Loop step:** launch
> **Measure it moves:** share of leads who read the prospectus and who book a call, without pushing up unsubscribes
> **Expected effect:** each lead gets fewer emails, and each one is either the next piece of the story or a direct response to something they did, so more are opened and more calls are booked
> **How we'll know:** the checks at the bottom pass with test leads; after launch, booking rate and unsubscribes per email are compared with today's franOS over a set period

## The rule
**No lead gets more than one email a day.** Emails about a call they have booked (confirmation, reminders, changes) are the only exception, because they asked for those.

Each day franOS picks the one most relevant email for each lead, in this order:

1. **A reaction,** if they have just done something meaningful.
2. **A nudge,** if they have been stuck on the same step for 3 days.
3. **Otherwise the next sequence email.**

A reaction or nudge does not add to the pile. It takes that day's place, and the sequence email moves back a day.

## The emails, by type
Every one is tied to a step on the path: prospectus, call, Next steps, Questions.

### Reactions (they just did something)
| Email | Sent when | Pushes |
|---|---|---|
| **Read the prospectus** | 10 minutes after they first open or download it | A call |
| **Watched a testimonial** | 10 minutes after they pass halfway on a franchisee's video. Names that person: "Want to talk to this person?" | A call |
| **Missed their call** | After a no-show (already built) | Rebooking |

- Each reaction is sent **once per lead.**
- Each testimonial has an on/off switch for the reaction, for franchisees who should not be offered for a chat.
- "Read the prospectus" and "Watched a testimonial" are skipped for a lead who already has a call booked.
- If they have already had an email that day, the reaction goes the next morning instead.

### Nudges (they are stuck)
| Email | Sent when | Pushes |
|---|---|---|
| **Has not opened the prospectus** | 3 days after sign-up, and once more 7 days after that | The prospectus |
| **Has not booked a call** | 3 days after they read the prospectus, and once more 7 days after that | A call |

- **Two at most for each step,** then the nudges stop and the sequence carries on.
- A nudge is cancelled the moment the lead does the thing.

### The sequence (the story, whatever they do)
Unchanged: about 20 emails on days 1, 2, 3, 5, 7, 10, 14, then weekly, at the brand's send time. Each still ends with the changing next-step button. A sequence email that loses its day to a reaction or nudge goes the next day, and the ones after it keep their spacing.

### Rules across all of them
- Sent between 8am and 9pm UK time only; anything due outside that waits until morning.
- Nothing goes to a lead who has unsubscribed, signed or is not going ahead.
- The brand's daily limit still applies.
- A staff preview ("view as") never sets off a reaction.

## The Emails tab
One screen, grouped into folders that open and close. Each folder says in a line when its emails go.

```
EMAILS                                   One email a day per lead:
                                         a reaction first, then a nudge,
                                         otherwise the next in the sequence.

v  When they sign up                                    1 email
     Your prospectus, {first_name}      At sign-up      On    Sent 41  Opened 30  Clicked 22  Unsub 0

v  The sequence                                         20 emails     [ + Add an email ]
     1  Ali's story                     Day 1           On    Sent 38  Opened 21  Clicked 6   Unsub 1
     2  What it really costs            Day 2           On    ...
     3  ...

v  Reactions: when they do something                    3 emails
     What did you make of it?           10 min after they read the prospectus     On   ...
     Want to talk to {person}?          10 min after they watch half a testimonial On   ...
     Sorry we missed you                After a missed call                        On   ...

v  Nudges: when they are stuck                          2 emails
     Did you get the prospectus?        3 days after sign-up, not opened          On   ...
     Shall we have a chat?              3 days after reading it, no call          On   ...

>  Call emails                                          6 emails   (closed)
```

- **Click any email** to edit its wording and preview it as a chosen lead would get it, as now.
- **Each row shows** when it is sent in plain words, on or off, and sent, opened, clicked and **unsubscribed** (new: so an email that puts people off can be spotted).
- **Add an email** adds one to the sequence; sequence emails can be reordered, and deleted if never sent.
- **Call emails** (confirmation, reminders, moved, cancelled) appear in their own folder so everything a lead can receive is in one place. Their wording becomes editable here too.
- **On a lead's Opportunity tab:** one line saying what they will get next and when ("Tomorrow 9:20am: sequence email 4"), so nobody has to work it out.

## Not in this add-on
- Reactions to other actions (opened Next steps, went quiet for a month)
- Picking different sequence emails for different leads (Hormozi's "greatest hits" by objection): later, once call transcripts are being read
- More call reminders (a separate small job: decision 75)
- WhatsApp or text versions

## Checks before it counts as done
- [ ] No lead ever gets two emails on the same UK day, apart from emails about their own call
- [ ] Opening the prospectus sends "What did you make of it?" 10 minutes later, once; if they already had an email that day, it goes the next morning
- [ ] Watching half a testimonial sends "Want to talk to this person?" once, naming that person; less than half sends nothing; a testimonial switched off sends nothing
- [ ] A lead with a call booked gets neither of those two reactions
- [ ] A lead who has not opened the prospectus 3 days after sign-up gets the nudge, and once more 7 days later, and never a third
- [ ] A lead who read the prospectus 3 days ago with no call gets the call nudge, and once more 7 days later
- [ ] Doing the thing cancels its nudge
- [ ] On a day with a reaction or nudge, the sequence email moves to the next day and later ones keep their spacing
- [ ] Nothing is sent outside 8am to 9pm, or to a lead who has unsubscribed, signed or is not going ahead
- [ ] The Emails tab shows the five folders, with unsubscribes counted against the email that was opened last before the unsubscribe
- [ ] A lead's Opportunity tab says what they will get next and when
- [ ] A staff preview never sets off a reaction
- [ ] One brand's emails and sends are invisible to another brand

## For Adam to confirm
1. **The five folders** on the Emails tab, laid out as above. OK?
2. **The three reactions and two nudges.** Any to add or drop?
3. **Nudge timing:** 3 days, then once more 7 days later, two at most. OK?
4. **Wording:** placeholders to start, using today's subjects where they fit ("Did you get the prospectus, {first_name}?", "Shall we have a chat?"). The real wording comes from the copywriter agent or from your GoHighLevel templates.

Adam approved all four points as suggested.

## Progress
**14 Nov 2026 — built on Adam's computer.** 123 automatic tests pass (15 new for this). Walked through in a browser on a separate test database, which was deleted afterwards.

Working:
- **One email a day per lead,** checked by a test that runs every hour for three weeks while the lead reads the prospectus and watches a testimonial
- **Reactions:** "What did you make of it?" 10 minutes after the prospectus is first read; "Want to talk to {person}?" 10 minutes after half a testimonial, naming the franchisee, with a Schedule a call button. Once each. Skipped for a lead with a call. Dropped if they could not go within two days
- **Nudges:** prospectus not opened, and call not booked: 3 days, then once more 7 days later, then they stop. Cancelled when the lead does the thing
- **The sequence gives way** to a reaction or nudge and keeps its spacing afterwards
- **Nothing between 9pm and 8am** except the prospectus email at sign-up. Nudges and sequence emails go at the brand's send time, also when overdue
- **Emails tab in five folders,** each saying when its emails go, with sent, opened, clicked and unsubscribed for every email
- **Add an email** to the sequence, move one earlier or later, delete one that has never been sent
- **A testimonial can be kept out of the chat offer** by adding "| no chat" to its line in Settings
- **On each lead:** "Next email: ..., tomorrow at 9:20am" on the Opportunity tab, and the reason each email was sent on the Activity tab
- A brand set up before this has a button to add the reaction and nudge emails

Different from the spec:
- **An unsubscribe is counted against the last email the lead was sent,** not the last one they opened. Opens are an unreliable guide (some mail apps open everything), so the last one sent is the steadier measure
- **Call emails and "Sorry we missed you" are listed but their wording is not editable yet.** They show how many were sent; opens and clicks are not tracked on them
- **Moving a sequence email swaps it with its neighbour, day included,** so the timetable itself stays as it was

Not done yet:
- Editing the wording of call emails on screen
- Real wording for the reactions and nudges: they are placeholders using today's subjects
- Unsubscribes per email only count from now on; earlier ones are not attributed
- Browser tests that run automatically

**14 Nov 2026 — the sequence made daily, after Adam tried it.** The sequence is now one email a day in the order shown, with no day numbers to set (decision 78). The arrows change the order; switching an email off closes the gap. The sections above that mention days 1, 2, 3, 5, 7 describe the earlier version.

