# Step 2 spec: nurture (the emails)

> **History.** This spec records how this part was agreed and built, including things later changed. For how franOS works now, read `00-how-franos-works.md`.

**Status:** approved by Adam on 14 November 2026 with the suggested defaults. Built on Adam's computer; see Progress at the end.

> **Brand:** all (first used by Refresh Renovation)
> **Loop step:** launch
> **Measure it moves:** share of leads who are call-ready, cost per booked call
> **Expected effect:** every lead gets the prospectus straight away, then regular emails that each push the one step they have not done yet
> **How we'll know:** the checks at the bottom all pass, using test leads

Built on Adam's computer first. Emails land in the test mailbox, where they can be read as a lead would see them. Real sending is switched on when the AWS account and the franchise domain exist.

## How it works
**One email sequence per brand, and one changing "next step" block.** This replaces today's separate Email Chain and CTA Chain.

1. **The prospectus email** goes out the moment someone signs up. It is the only place a new lead gets the prospectus link.
2. **The sequence** then sends one email at a time on a schedule: testimonials, useful content, answers to common worries. The copywriter agent writes them.
3. **Every email carries the next-step block:** a button and a PS that change with what this lead has and has not done.

| The lead has not yet… | The block says |
|---|---|
| opened the prospectus | Read the prospectus |
| booked a call | Schedule a call |
| opened Next steps | Read your next steps |
| opened Questions | See the questions to ask us |
| (done all four) | Reply to this email with any questions |

So no email is wasted: whatever it is about, it also pushes the one step the lead is missing.

## The path (first version)
franOS works out each lead's path from what it has tracked: watched the introduction video, opened the prospectus, booked a call, opened Next steps, opened Questions. The lead's page shows these as ticks, with the next step named. "Booked a call" stays unticked until Step 3 builds booking.

## Timing
- Prospectus email: immediately.
- Sequence emails: each has a "days after sign-up" number, set per email. Suggested start: days 1, 2, 3, 5, 7, 10, 14, then weekly.
- Sent at a set time of day, UK time. Suggested: 9:20am, every day of the week.
- Timed by the jobs table built in Phase 0. On this computer it runs every minute while franOS is open, and there is a "send due emails now" button for testing.

## When emails stop
- The lead unsubscribes (stops for good)
- The address bounces or the lead marks an email as spam (stops for good; switched on with real sending)
- The lead is marked signed or not interested
- A booked call does **not** stop the sequence; the next-step block simply moves on

## Tracked links, opens and unsubscribe
- **Every link goes through franOS,** so each click shows on the lead's timeline. Clicking also tells franOS who the visitor is, so page views and video plays from an email are recorded on the right lead, even on a different device.
- **Opens are recorded** as a rough guide only (Apple Mail opens emails by itself).
- **Unsubscribe link in every email,** plus the one-click unsubscribe that Gmail and Yahoo require. An unsubscribed address is never emailed again by that brand.

## What an email looks like
- From a name and address set per brand, for example "Mike from Refresh Renovation"
- The brand's logo and colour, plain readable text, the next-step block, then a footer with the company's registered details and the unsubscribe link
- Personal touches such as the lead's first name

## Managing emails in franOS
- **Emails tab per brand:** the list in order, with subject, days after sign-up, on or off, and how many were sent, opened and clicked
- **Edit an email:** subject, wording, timing
- **Preview:** see any email exactly as a chosen lead would get it, with their name and their next-step block
- **Send a test** to the test mailbox
- **On the lead's page:** every email sent, opened and clicked appears on the timeline, with the path ticks

Refresh Renovation starts with placeholder emails: the prospectus email and five sequence emails. The real ones come from the copywriter agent once the prospectus and interviews exist.

## Warm-up limit
Each brand has a "most emails per day" number. A new email domain has to start small, so anything over the limit waits until the next day. The prospectus email always goes first.

## Not in this step
Real sending through Amazon SES, automatic handling of bounces and spam complaints, the reply relay, call reminders (Step 3), WhatsApp.

## Checks before it counts as done
- [ ] Signing up sends the prospectus email at once, and it appears in the test mailbox with the lead's name
- [ ] Clicking the prospectus link opens the prospectus and records the click and the open on the right lead
- [ ] The next-step block changes after each step is done, in the order in the table above
- [ ] Each sequence email goes on its day and at the set time, once, and never twice
- [ ] An unsubscribed lead gets no more emails, and the unsubscribe shows on their timeline
- [ ] The one-click unsubscribe works without the person being logged in or confirming
- [ ] A lead marked signed or not interested gets no more emails
- [ ] The daily limit holds, and held-back emails go the next day
- [ ] Turning an email off stops it for leads who have not had it yet
- [ ] One brand's emails, leads and unsubscribes are invisible to another brand
- [ ] A tracked link cannot be altered to redirect to another website
- [ ] The preview matches what is sent
- [ ] A consultant can read emails and stats but cannot edit them

## For Adam to confirm
1. **One sequence with a changing next-step block,** instead of separate chains. OK?
2. **The timing:** days 1, 2, 3, 5, 7, 10, 14, then weekly, at 9:20am every day. Change any of it?
3. **Who the emails come from** for Refresh Renovation: "Mike from Refresh Renovation"?
4. **How many sequence emails at launch.** Today's franOS has 25. The same, or fewer to start?

## Progress
**14 Nov 2026 — built on Adam's computer.** 62 automatic tests pass (17 for emails). Walked through in a browser with a test lead on a separate test database.

Working:
- The prospectus email goes at sign-up; sequence emails go on their day at the set UK time, once each, one per lead per day
- The next-step button and PS follow the lead's path
- Tracked links, with the click and the page opened recorded on the lead; an altered link is refused
- Opens recorded once
- Unsubscribe page with one button, and one-click unsubscribe for mail apps; unsubscribed leads get nothing more
- Leads marked signed or not interested get nothing more (there is no button to mark them yet; that is Step 4)
- Daily limit, with held emails going the next day, longest-waiting first
- Emails tab with sent, opened and clicked counts; editor; preview as any lead; send a test; email settings
- Path ticks and email activity on the lead's page
- New brands get the starter emails. A brand made before this step has an "Add the starter emails" button

Different from the spec:
- **Timing does not use the jobs table.** Every minute franOS looks at who is owed which email and sends it. This means a change to an email's day or on/off switch applies to everyone at once, with no leftover scheduled jobs. The jobs table stays for one-off timed work such as call reminders
- **Defaults taken, not yet confirmed by Adam:** sender "The <brand> team", five placeholder sequence emails on days 1, 2, 3, 5 and 7, sent at 9:20am

Not done yet in Step 2:
- **Real sending.** Emails go to the test mailbox. Amazon SES, bounces and spam complaints come with AWS
- **If sending fails part-way through a batch on a real mail service, an email could be sent twice.** Needs a safer hand-off before SES is switched on
- **Adding or deleting emails, and reordering them, on screen.** Existing ones can be edited and switched off
- **Links to other websites inside an email.** Only the brand's own pages can be linked for now
- **Browser tests that run automatically.** The walk-through was by hand
