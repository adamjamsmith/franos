# Step 3 spec: calls (booking and Zoom)

> **History.** This spec records how this part was agreed and built, including things later changed. For how franOS works now, read `00-how-franos-works.md`.

**Status:** approved by Adam on 14 November 2026, with his changes to the call settings (9am to 5pm, 30-minute calls with a 30-minute gap, bookable 7 days ahead). See Progress at the end.

> **Brand:** all (first used by Refresh Renovation)
> **Loop step:** launch
> **Measure it moves:** cost per booked call, show rate, and how fast a good-fit lead gets a call
> **Expected effect:** a lead can book a call with the consultant in under a minute, turns up because of reminders, and the call's recording and transcript land on their record
> **How we'll know:** the checks at the bottom all pass, using test leads

Built on Adam's computer first. There is no Zoom account yet, so a stand-in Zoom makes the meeting links and hands back a sample recording and transcript. The real Zoom is connected when the account exists, with no change to how it works.

## What a lead sees
1. **"Schedule a call" on the thank-you page** becomes a real booking section. The same section sits on the prospectus page, and the "Schedule a call" button in the emails opens it.
2. **They pick a day and a time.** Only the next few days are offered, in UK time. franOS already knows who they are, so they do not type their details again.
3. **They get a confirmation page and a confirmation email** with the date and time, the Zoom link, an "add to my calendar" file, and links to change or cancel.
4. **They get reminders** before the call.
5. **They join on Zoom** at the time.

## Who can book
Only someone who has filled in the form. A visitor franOS does not know is sent to the form first. This means every booked call has the lead's answers, Fit score and consent behind it, and Meta's Schedule event always belongs to a known lead.

## When calls can be booked
Set per brand, by the owner:

| Setting | Suggested start |
|---|---|
| The consultant's working hours | Monday to Friday, 9am to 5pm |
| Length of a call | 30 minutes |
| Gap between calls | 30 minutes (so one call an hour) |
| How far ahead a lead can book | The next 7 days |
| Shortest notice | 2 hours |
| Days off | Added one at a time (holidays, bank holidays) |

A time that is taken is never offered again, and two leads pressing the same time at once cannot both get it.

**The consultant's own calendar.** In this step franOS works from the hours above and its own bookings, and emails the consultant a calendar invite for every booking, change and cancellation. It does not yet read the consultant's Google or Outlook calendar, so it cannot see their other appointments. That connection needs the consultant's calendar account, and is added before launch (see "For Adam to confirm").

## The emails this step adds
| Email | When |
|---|---|
| **Confirmation** to the lead | At once |
| **New booking** to the consultant, with a link to the lead's record | At once |
| **Reminder** to the lead | The day before, and 1 hour before |
| **"Sorry we missed you, pick another time"** to the lead | After a no-show |
| **Changed / cancelled** to the lead and the consultant | At once |

Reminders use the jobs table from the foundations. Changing or cancelling a call cancels its reminders. These emails are about the lead's own call, so they are still sent to someone who has unsubscribed from the sequence. Every one of them says the call is recorded.

## Changing and cancelling
- **The lead** can change or cancel from the links in their emails, with no login.
- **The owner or consultant** can book for a lead, change or cancel a call from the lead's record.
- A cancelled call unticks "Booked a call" on the path, so the emails go back to pushing "Schedule a call".

## Zoom
- **Booking makes a Zoom meeting** on the brand's Zoom account, and its link goes in the confirmation and reminders.
- **After the call, franOS collects from Zoom:** whether the lead joined, how long the call lasted, the recording, and the transcript. All of it is saved on the lead's record, and the transcript can be read there.
- **Show or no-show is worked out from who joined.** The consultant can correct it.
- **The lead is told the call is recorded:** in the consent wording on the form (already there), in the confirmation and reminder emails, and by Zoom's own notice when they join.
- Recordings are kept in franOS's own storage, not left on Zoom.

## Speed-to-lead alert
When a new lead signs up with a good Fit score, franOS emails the consultant straight away: "New good-fit lead, call now", with the lead's name, their answers, a tap-to-call phone number and a link to their record.

| Setting | Suggested start |
|---|---|
| Fit score that counts as good | 70 or more |
| Hours alerts are sent | 8am to 8pm, every day. Outside those hours the alert waits until 8am |

The alert is an email for now. Text messages are on the later list.

## Telling Meta
A lead's first booking records a **Schedule** event, which is what the ads optimise on. On this computer it is only recorded, never sent. It goes to Meta from the server once the Meta account is connected and Adam approves go-live. Changing a booking, or booking a second call, does not send another one.

## In franOS
- **Calls tab per brand:** upcoming calls, then past calls with showed or no-show, and the show rate
- **On the lead's record:** each call with its time, status, Zoom link, recording and transcript; booking, change, cancel, reminders and the call itself on the timeline
- **"Booked a call" ticks on the path,** and the next-step button in the emails moves on to "Read your next steps"
- **Call settings** on the brand's Settings tab: the table above, and the consultant the calls are with
- **A testing button on this computer:** "pretend this call has happened", with showed or no-show, so the whole flow can be tried without waiting

## Not in this step
- Reading the consultant's Google or Outlook calendar (before launch, needs their account)
- Google Meet (after launch; Meet clients upload recordings)
- "How did it go?" outcomes with BANT, and the board (Step 4)
- Pulling objections and BANT out of transcripts automatically (Step 5)
- The tracked phone number and text reminders (after launch)
- Emails triggered by what a lead does (later list)

## Checks before it counts as done
- [ ] A known lead can book a call from the thank-you page, the prospectus page and an email, without retyping their details
- [ ] A visitor franOS does not know is sent to the form, and cannot book
- [ ] Only times inside the working hours, the booking window and the notice period are offered
- [ ] A taken time is not offered, and two leads cannot get the same time
- [ ] The lead gets the confirmation with the right UK date and time, the Zoom link and a calendar file that opens correctly, including across the clock change
- [ ] The consultant gets the new-booking email
- [ ] Reminders go the day before and 1 hour before, once each
- [ ] Changing a call moves the reminders; cancelling stops them and frees the time
- [ ] Change and cancel links cannot be altered to reach another lead's call
- [ ] An unsubscribed lead still gets their call emails, and still gets no sequence emails
- [ ] "Booked a call" ticks on the path and the next-step button moves on; cancelling unticks it
- [ ] After a call, attendance, recording and transcript appear on the lead's record
- [ ] A no-show is marked and gets the "pick another time" email, once
- [ ] One Schedule event is recorded per lead, and nothing is sent to Meta from this computer
- [ ] A good-fit lead triggers the alert at once inside alert hours, and at 8am outside them; a low-fit lead triggers none
- [ ] One brand's calls, recordings and transcripts are invisible to another brand
- [ ] A consultant can see and manage calls but cannot change the call settings

## For Adam to confirm
1. **Only people who have filled in the form can book.** OK?
2. **The consultant's calendar:** build now with working hours set in franOS plus a calendar invite to the consultant, and connect their Google or Outlook calendar before launch. OK, or must it read the calendar from the start?
3. **Call length and hours:** 45 minutes, 15-minute gap, Monday to Friday 9am to 5:30pm, the next 5 days, 2 hours' notice. Change any of it? **Adam: 30 minutes with a 30-minute gap, 9am to 5pm, 7 days ahead, 2 hours' notice.**
4. **Reminders:** the day before and 1 hour before, by email. Change?
5. **Speed-to-lead alert:** Fit 70 or more, by email to the consultant, 8am to 8pm. Change?

Adam confirmed points 1, 2, 4 and 5 as suggested on 14 November 2026.

## Progress
**14 Nov 2026 — built on Adam's computer.** 88 automatic tests pass (26 for calls). Walked through in a browser with a test lead on a separate test database, which was deleted afterwards.

Working:
- "Schedule a call" on the thank-you page and the prospectus page. A lead franOS knows books with one press; anyone else is sent to the form
- franOS knows a lead from the browser they signed up in, from any link in their emails, and from the signed link to one of their calls
- Times offered follow the call settings: working days and hours, call length and gap, days ahead, shortest notice, days off
- A taken time is not offered, and the database itself refuses a second booking for the same time
- The lead's own call page: details, Zoom link, calendar file, pick a new time (moves the call), cancel. No login; the link is signed and cannot be pointed at another call
- Emails: confirmation, new booking to the consultant, moved, cancelled, reminders the day before and 1 hour before, "sorry we missed you". Each says the call is recorded. They still reach a lead who has unsubscribed from the sequence
- Reminders run from the jobs table and move or stop with the call
- "Booked a call" ticks on the path and the next-step button moves on. Cancelling or a no-show unticks it
- After a call: showed or no-show, length, recording and transcript on the lead's record. The consultant can set or correct showed and no-show
- One Schedule event per lead, recorded only. Nothing is sent to Meta
- Speed-to-lead alert by email, with a tap-to-call number: at once inside alert hours, at 8am otherwise, never for a low-fit lead, never twice
- Calls tab: upcoming, past, show rate, call settings. Calls section on each lead's record, where an owner or consultant can book, move or cancel
- The client role can read calls but not change them. One brand's calls are invisible to another

Different from the spec:
- **Call settings are on the Calls tab,** not the Settings tab, to match how email settings sit on the Emails tab
- **The calendar invite is a link** ("Add it to my calendar") in the emails, not an attached file. The test mailbox cannot carry attachments; a real attachment comes with Amazon SES
- **Booking emails and alerts go to the brand's consultants** (People tab). A brand with no consultant yet sends them to the owner

Not done yet in Step 3:
- **The real Zoom.** A stand-in makes the meeting links. Calls are finished with the "Pretend this call has happened" button, which adds a sample recording and transcript. The connection is built as one small swappable part, ready for the Zoom account
- **Keeping recordings in franOS's own storage.** For now only the recording's address is saved. Storage comes with AWS
- **Reading the consultant's Google or Outlook calendar.** As agreed, before launch
- **A lead on a new device with no email link** is treated as unknown and sent to the form. Filling it in again finds their existing record
- **Editing the wording of the call emails on screen.** The wording is fixed for now
- **Browser tests that run automatically.** The walk-through was by hand

**14 Nov 2026 — changes after Adam tried it.**
- **The booking calendar now works like Calendly,** in the brand's colour: a month on the left with the free days marked, the times for the chosen day on the right, then Next, then a page that shows the lead's name and email before they confirm. Nothing is booked until the last button. Used on the thank-you page, the prospectus page and the lead's own call page
- **The sign-up form keeps what was typed when something is wrong.** The wrong boxes turn red with a short reason under each, and the page moves to the first one. Email and phone are checked more carefully
- **A "View site" button** in each brand's top bar opens its public page

**14 Nov 2026 — reminders brought up to today's franOS.** 124 automatic tests pass.
- **Six emails around a call** where there were three: on booking, then 3 days, 1 day, 12 hours, 1 hour and 10 minutes before. One whose time has already passed when the call is booked is skipped, not sent late
- **Two versions.** A lead who has not read the prospectus is asked to read it before the call, with links to the prospectus, Next steps and Questions. A lead who has read it gets Next steps and Questions only. "Starting in 10 minutes" is only about joining
- All six are listed in the Call emails folder on the Emails tab
- Not done: the links to the prospectus, Next steps and Questions in call emails are plain links, so a click on them is not recorded as an email click (the page view still is, on a device franOS knows). Calls booked before this change keep the reminders they were given

