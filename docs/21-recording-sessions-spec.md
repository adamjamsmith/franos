# Recording sessions: booked, recorded and saved by franOS

**Status:** approved by Adam on 16 November 2026 with the five recommendations (decision 114), and built on his computer the same day. See Progress at the end.

> **Brand:** all (first used by Refresh Renovation)
> **Loop step:** assets
> **Measure it moves:** none directly; it shortens the time from signing a client to having testimonials and a franchisor interview ready to cut
> **Expected effect:** Adam sends one link, the session lands in his diary, Zoom records it, and the recording and transcript are in franOS against the brand without Calendly or any copying by hand
> **How we'll know:** the checks at the bottom pass with a test session; the first real Refresh Renovation testimonial is booked and recorded this way

## What it is
A way to book a recorded Zoom session between Adam and someone who is not a lead: a franchisee giving a testimonial, the franchisor being interviewed, or anything else worth recording for a brand.

It reuses what lead calls already do: picking a time, the Zoom meeting, the confirmation and reminder emails, and collecting the recording afterwards.

## The booking link
- **One link per kind of session, per brand.** Three kinds: Testimonial, Franchisor interview, Other.
- **Where Adam gets it:** the Sessions screen (below) has a copy icon beside each kind.
- **The link carries a code**, so it cannot be guessed from the brand's name. Anyone who has the link can book.
- It is a page on the brand's public address, in the brand's colours and logo, with no menu and no link to the rest of the site.

## What the person sees
1. A short line saying what the session is, who it is with, how long it takes, and that it is recorded on video.
2. **Their details:** first name, last name, email, phone (optional).
3. **The permission tick** (required). Wording below.
4. **A time,** picked the same way a lead picks a call time.
5. A confirmation page with the date, the Zoom link, an "add to calendar" link, and the line that the session is recorded.

A mistake keeps everything they typed, the same as the sign-up form.

## Permission wording
One required tick, with a link to a short privacy note for people being filmed:

> I agree to this Zoom session being recorded (video, sound and a written transcript), and to [Brand] and Franchise Right using the recording, my name and what I say in adverts and other marketing for the franchise, including paid adverts on social media. I can withdraw this at any time by emailing [brand email]; adverts will be taken down, but that cannot undo what has already been seen.

- The wording and the time it was ticked are saved with the session, the same as a lead's consent. **That saved record is the permission held for every advert made from the session.** There is no separate signed release form.
- **One tick, not two (decision for Adam, below).** The strict reading prefers a second, optional tick for advert use. One tick is proposed because a testimonial session has no purpose without it, the same choice as decision 109.
- Drafted by Claude and not checked by a lawyer (decision 110). The privacy note for people being filmed is added to `docs/20-legal-wording.md`: what is kept (name, email, phone, video, voice, transcript), who uses it (the brand, Franchise Right, with Zoom and Anthropic handling it for them), how long, and how to withdraw.

## Times on offer
- **Adam's own hours for sessions,** set once under Settings > Calls: which days, from when to when, session length, and days off. They are separate from the hours leads can book calls.
- A time is offered only if it is clear of every other session **and** every lead call, in every brand, with a gap either side.
- **Session length:** 60 minutes to start with.
- **Shortest notice:** 24 hours. Booking window: 21 days.
- **Adam's other appointments are not seen yet.** That needs his calendar connected, which is the same job as connecting the consultant's calendar (C5 in the launch plan) and is done once for both. Until then he blocks time with days off.

## Emails
To the person booked: confirmation, a reminder the day before and one an hour before, and a link to move or cancel. Same layout as the call emails, with their own wording. Each carries the "this session is recorded" line.

To Adam: a note when a session is booked, moved or cancelled.

These are not marketing emails. The person is not added to any sequence and is not a lead.

## Zoom
- franOS creates the meeting on Adam's Zoom user, set to record to the cloud.
- The account is on Zoom Pro from 16 Nov 2026. Its recording settings, agreed and tested that day: speaker view, one video file, a combined sound file, a separate sound file per person, a transcript, no names stamped on the picture.
- Zoom's own "this meeting is being recorded" announcement stays switched on, so everyone hears it when they join.
- **How Adam runs it:** he asks each question unmuted, then mutes himself while they answer, so the picture stays on them.
- Zoom cannot save a separate video per person.

## Afterwards
About ten minutes after the booked end time franOS asks Zoom what happened, as it does for lead calls. If fewer than two people joined, the session is marked "did not happen".

**New for sessions:** if the recording or transcript is not ready yet, franOS asks again every 15 minutes for up to 3 hours, then marks the session as needing a look.

It saves against the session:

- whether it happened and how long it ran
- the link to the recording in Zoom
- the transcript
- the links to each person's own sound file

**The video itself stays in Zoom** in this first version. Zoom's plan has limited space, so copying finished recordings into franOS and clearing them from Zoom is the next step after this one (see Later).

## The Sessions screen
Under **Calls**, a third switch beside Calendar and List: **Sessions**. Owner only.

- At the top: the three booking links, each with a copy icon.
- Below: a tight table of sessions, upcoming first, then past. Columns: date and time, who, kind, state (booked, happened, did not happen, cancelled, needs a look), and icons to open the recording, read the transcript, move, cancel or delete.
- Booked sessions also show on the Calls calendar, in their own colour.

No explanatory text on the screen.

## What the agents get
The transcript and the session's kind and person are readable by the agents, so the copywriter and video editor can pull quotes and plan a cut as soon as a session has happened.

Agents do not store health or other sensitive details from a transcript as fields.

## Using a testimonial in an advert
- It is the person's own words. It is not scripted, and it is not edited in a way that changes what they meant.
- The person is shown as a franchisee of the brand, so the connection is clear.
- **Any earnings, turnover, profit or funding figure said on camera is rough until checked.** Before it is used it must trace to a source (the moment in the recording, and the franchisor's or franchisee's own figures) and pass the fact and compliance checker. Results are not presented as typical unless that is evidenced.
- The saved permission, the session and its recording are the evidence kept for each advert.

## What it does not do
- Nothing is sent to Meta. A session is not a lead, has no Fit score and is not on the board.
- Nothing about a person's age or gender is recorded or worked out from the video.
- No AI analysis of the video picture.

## How long things are kept
- **Session recordings, transcripts and the person's contact details** are kept while the recording is in use in the brand's marketing, and looked at again every 12 months otherwise.
- They are deleted when the person withdraws permission or asks, from franOS and from Zoom. The delete icon on the Sessions screen does both.
- This is a separate rule from the 12 months for lead-call recordings (decision 111), and needs Adam's approval and its own line in the decisions log.
- The 12-month look is by hand: franOS does not delete anything on a timer yet.

## Later (not in this build)
- Copying the video and sound files into franOS and clearing them from Zoom.
- Adam's calendar connected, so busy times are seen automatically.
- Someone other than Adam hosting a session.
- A recording tool that saves each person's video separately, if Zoom's picture is not good enough.

## Decisions for Adam
| # | Decision | Recommendation |
|---|---|---|
| 1 | Session length | 60 minutes |
| 2 | Hours on offer | Monday to Friday, 9am to 5pm, until told otherwise |
| 3 | Where the video lives in this first version | In Zoom, with the link in franOS |
| 4 | The permission wording, as one required tick | Use it |
| 5 | Keeping rule: while in use, looked at every 12 months, deleted on request | Use it |

## Checks before it counts as built
1. A booking link for each kind opens the booking page; a made-up code does not.
2. A test session booked through the link appears on the Sessions screen and the Calls calendar, and creates a Zoom meeting set to record.
3. The form cannot be sent without the permission tick, and the wording and time are saved.
4. A time taken by a lead call in any brand is not offered, and the other way round.
5. Confirmation and reminders arrive, each saying the session is recorded; the move and cancel link works and updates Zoom.
6. After a real two-minute test session, the recording link, transcript and both sound-file links show against the session.
7. Someone who is not the owner cannot see the Sessions screen, and one brand's sessions never show under another brand.
8. No Meta event is created for a session.
9. Deleting a session removes its recording from Zoom as well as from franOS.

## Progress
**16 Nov 2026: built on Adam's computer.** 26 automatic tests cover the checks above. Checked by hand: a booking link opened the booking page, a made-up code gave "not found", a test booking created a real Zoom meeting and showed on the Sessions screen.

Three places where the build is simpler than the spec:
- **Times are picked from a list**, not the month calendar a lead uses.
- **Session hours are fixed** at Monday to Friday, 9am to 5pm, 60 minutes, a day's notice, three weeks ahead. There is no settings box for them yet. The days off set for the brand's calls count for sessions too.
- **The owner moves a session from the person's own page** (the calendar icon opens it).

Not yet checked with a real session: the recording, transcript and sound files arriving against a session (check 6), and deleting a session removing its recording from Zoom (check 9). The franos Zoom app was allowed to delete recordings on 16 Nov, and removing the video from a test recording worked.
