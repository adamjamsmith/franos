# How franOS works today

**This is the current picture.** Written 14 November 2026, last updated 15 November 2026. If this and a numbered spec disagree, this is right: the specs (docs 10, 12 to 16, and 19) are the history of how each part was agreed and built, including things later changed. Decisions are in `02-decisions-log.md`; what is left to do is in `17-plan-to-launch.md`.

franOS runs on Adam's computer only. Nothing is live. Email goes to a test mailbox, a stand-in plays Zoom, and Meta events are recorded but not sent.

## What it is
One system for every brand. Each brand has its own public pages, form, emails, calls and leads, and nobody in one brand can see another's. People log in with an emailed code plus an authenticator code. An owner sees every brand; a client or consultant sees their own.

## What a lead goes through
1. **Homepage.** The headline and three ticks on the left with a picture of the prospectus on the right, the sign-up form headed "Download the prospectus", then the testimonials and proof images.
2. **Form.** Contact details, the avatar questions as tick-one circles, one required consent tick. A mistake keeps everything typed and marks the wrong box red. The answers give a **Fit score** out of 100. Someone who completes the form but misses a must-have answer sees "Thanks for your interest" and goes no further (see The form, below).
3. **Thank-you page.** Text, the introduction video with the calendar straight under it, then the testimonials and proof images.
4. **Prospectus email,** at once.
5. **Emails,** one a day at most (see below).
6. **Booking.** A calendar like Calendly: pick a day, pick a time, Next, check name and email, Book call. Only people who have filled in the form can book.
7. **The call,** on Zoom, recorded.
8. **Next steps and Questions** pages.
9. **Signed,** or not going ahead.

franOS records every step on the lead: pages opened, video watched and how far, emails sent, opened and clicked, calls, and what happened on them. From that it knows each lead's **path** (introduction video, prospectus, call, Next steps, Questions) and their **next step**: the first of prospectus, call, Next steps, Questions they have not done.

## The public pages
The homepage, the thank-you page and each video page share **one layout**, a single centred column. Only the top block differs:

| Page | Top block |
|---|---|
| Homepage | Headline and three ticks (two thirds), a picture of the prospectus (one third), then the form |
| Thank-you | Text, the introduction video, the calendar |
| Video page | Its title, the video, the calendar (or the form, for a visitor who has not signed up) |

Under that, every page has each testimonial (title, video, button) and then the proof images in columns of mixed shapes (and the button again). Proof images are set under Settings > Brand and pages, one per line with an optional caption; a line with no address shows as a placeholder box that says what picture will go there. A new brand starts with three ticks, three placeholder testimonials (A, B and C franchisee), seven placeholder proof boxes and a placeholder for the prospectus picture.

**Look.** There is no header. The page background is a light tint of the brand's colour, the footer a slightly deeper tint, and the form and calendar boxes are white.

**Footer,** on every public page: the brand's name or logo; the company's name, address and number; the earnings note ("Any earnings figures shown are projections based on the performance of existing franchisees. They are not a guarantee of what you will earn."); links to the privacy notice and the terms and conditions; and the copyright line with the year. The address, the earnings note and the terms are set under Settings > Brand and pages.

**The button asks for the visitor's next step.**

On the homepage the button is always "Download the prospectus" and goes to the form, whoever is looking. On the thank-you and video pages:

1. Not signed up: "Download the prospectus", which goes to the form.
2. Signed up, prospectus not read: "Download the prospectus", which opens it.
3. Prospectus read, no call: "Schedule a call", which goes to the calendar.
4. Call booked: "Download next steps". The questions are reached from there.

## Meta
franOS tells Meta when a lead signs up, books a call, has a good call and signs, so Meta can learn who to show the ads to.

| franOS records | Meta receives it as | Value |
|---|---|---|
| Lead (signed up and qualified) | Lead | |
| Schedule (booked a call) | Schedule | |
| Good call | SubmitApplication | |
| Signed | Purchase | The franchise fee, in pounds |

- **Franchise Right owns each brand's dataset;** the client owns the ad account and pays Meta. The dataset ID and its test code are set under Settings > Brand and pages. The dataset's access token is kept encrypted in AWS (`/franos/meta`).
- **Nothing real is sent until a brand is live.** Going live is not a box on any screen: it is set at go-live, with Adam's approval, together with the moment it happened. Until then every event carries the brand's test code, so it appears in Meta's "Test events" tab and nowhere else. With no test code, nothing is sent at all.
- **Test leads never become real events.** Once a brand is live, only events from the moment it went live are sent.
- **A person's details never leave in the clear.** Email, phone, name and postcode are tidied the way Meta specifies and then scrambled.
- **Each event has a fixed id,** so Meta counts it once even if it is sent twice.
- **The Lead and Schedule events include the visitor's browser and address,** captured at sign-up and when the lead books a call on the public page. Meta needs these to treat them as website events, which is what the ads optimise for. The consent tick covers this. A call booked by staff inside franOS goes as a system event, never as a website visit.
- Events are sent once a minute, alongside the emails and the call reminders.
- **The ad's click code.** When someone arrives from an ad, the link carries Meta's click code. The landing page passes it into the form without setting a cookie, franOS keeps it with the lead, and every event for that lead carries it, so Meta can match the lead to the ad.
- **The pixel.** Meta's browser script loads only for a lead who ticked consent wording that mentions cookies, on any page they look at after signing up. It reports the pages they view, and on the thank-you page the sign-up, with the same id the server uses so Meta counts it once. A new visitor gets no script and no Meta cookies, so there is no cookie banner. The team is never tracked. Before go-live it only loads if the brand has a test code. Unlike server events, browser events cannot carry a test code, so before go-live a brand must only ever be given a test dataset.

## Zoom
franOS talks to Zoom through a private app ("franos", a Server-to-Server OAuth app) on Franchise Right's own Zoom account, which Adam owns. Consultants are users on that account, on whatever email they have.

- **The app's three codes live encrypted in AWS,** in Parameter Store (`/franos/zoom`, in the franos project). Parameter Store is free; Secrets Manager, tried first, charges per entry. They are never in a file or in a chat. On Adam's computer, `npm run dev:zoom` fetches them with his own AWS login, hands them to franOS in memory, and starts it.
- **The app can only** create, read, change and delete meetings, read past meetings and who was in them, read recordings and transcripts, and look up users. It cannot touch billing, settings, or other users.
- **Each meeting** is set to record to the cloud by itself, with no waiting room, and the lead can arrive before the host.
- **After a call,** franOS asks Zoom what happened: nobody opened the meeting, or only one person was there, is a no-show; two or more is attended, with the length. If the call is still running it asks again every 15 minutes, for up to three hours.
- **Meetings are created on the account owner** for now. A brand's consultant becomes the host once they are added to the Zoom account.
- **Calls booked while the stand-in was in use** keep their made-up links and are left alone.

## Media
The owner adds a brand's pictures, videos and PDFs under **Settings > Media**. Each file gets an address that starts with `/media/`; "Copy address" copies it, to paste into the settings box that needs it (logo, prospectus picture, proof images, videos, documents, email pictures).

- **What can be added:** pictures (PNG, JPG, WebP, GIF) up to 25 MB, PDFs up to 50 MB, videos (MP4, WebM, MOV) up to 2 GB. SVG pictures are refused because they can carry scripts.
- **Who can see what:** only the owner can add or remove a file, and one brand never sees another's list. The files themselves are public to anyone with the address, because they are what the public pages and emails show.
- **Videos** are sent in the pieces the player asks for, so skipping forward works.
- **In emails,** an address that starts with `/` has the site put in front of it, so the picture shows in the reader's inbox.
- **Removing a file** is for good. Anything still using its address shows nothing.

Today the files are kept in a folder on Adam's computer, beside the local database and outside version history. When franOS moves to AWS, only the one file that reads and writes them changes (`src/media/store.ts`).

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

**Bounces and spam complaints.** When Amazon reports that an address does not work (a permanent bounce) or that the person pressed "spam" (a complaint), franOS stops every email to that address for good, in every brand that holds it. That includes emails about their own call, which an ordinary unsubscribe does not stop. The lead's record says why. A temporary bounce, such as a full mailbox, is left alone: Amazon tries again by itself. Amazon reports to `/api/ses`, which stays switched off until the topic's name is set (`FRANOS_SES_TOPIC_ARN`) and then only acts on messages carrying Amazon's own signature for that topic. Connected on the server since 15 Nov and tested with Amazon's own test addresses: a real bounce and a real complaint each stopped a test lead.

**Call emails** are separate: on booking, then 3 days, 1 day, 12 hours, 1 hour and 10 minutes before. Someone who has not read the prospectus is pointed at it; someone who has is pointed at Next steps and Questions.

**Layouts.** Five, chosen per email: Header, Header + video, Header + owner photo, No header, and Personal (plain, as if typed by the consultant). Reactions and nudges are Personal. A new brand starts with 24 named sequence emails (VT1 Short, VT2 Short, Funding...) with placeholder wording.

## Working the leads
**The board** shows opportunities only: anyone who has booked a call. Good-fit leads with no call yet are not on it; they are a list on the Leads screen. Leads who didn't qualify are on neither.

| Column | Means | How a lead gets there |
|---|---|---|
| Call scheduled | Has a call coming up | By itself |
| Interested | Has had a call and is still in play | By itself |
| Closing | More than interested, needs regular follow-up | Moved by hand |
| Signed | Signed | Marked by hand |

Clicking a card opens the lead in a pop-up. At the top, under their name and contact details, is the **progress meter**:

- **Fit:** the Fit score, tinted green at the brand's good-fit score or more, amber from 40, red below.
- **Interest:** how many of the four things a lead does themselves are done (prospectus, booking a call, Next steps, Questions), with a word. Cold is none. Warm is prospectus and booking. Hot is both plus Next steps or Questions. Anything else is Warming.
- **Intro video and Testimonials:** how far through the introduction video they got, and how many testimonials they watched at least half of. These are for information; they are not in the Interest count.
- **Timeline,** one row of five boxes, each with a count or a word and a date under it:

| Box | Says | Under it |
|---|---|---|
| Prospectus | How many times it was opened | When it was last opened |
| Booking | How many calls they have booked (cancelled ones left out) | The date and time of the call coming up, or when the last one was. This is the one place on the meter the time is shown |
| Next steps | How many times it was opened | When it was last opened |
| Questions | How many times it was opened | When it was last opened |
| Call | Not yet, Due, Attended, Good call, Not a good call, No-show | The date, or "Outcome needed" |

A box is tinted green when done, amber when waiting on us, red when missed, and left plain when nothing has happened. The next step has a bright border. Signed is not on the timeline: the stage beside the lead's name already says it.

Below the meter are three tabs: **Opportunity** (what to do next, calls, the next email, notes, how it ends; laid out as tight tables like the meter), **Form** (answers, Fit score, consent) and **Activity** (everything that has happened).

**After every call** the consultant answers six questions: budget, authority, need, timing, whether they are the kind of person we want, and what happens next. franOS works out **good call** from them: all four yes, and the right kind of person. A lead ends as **Signed** or **Not going ahead** with a reason from a fixed list.

**A new good-fit lead** triggers a "call now" email to the consultant, between 8am and 8pm.

## The numbers
For any period, four KPIs, top to bottom. Each has how many, what each one cost, and what share of the step before it turned into:

| KPI | Number | Conversion is a share of |
|---|---|---|
| Leads | People who signed up and qualified | Times the sign-up form was seen |
| Booked | Calls booked (with the share who attended shown small under it) | Leads |
| Good calls | Calls that passed the six questions | Booked |
| Signed | Signings | Good calls |

The cost of a signing is tinted green or red against the brand's target. With no ad spend entered for the dates, costs show as a dash, not £0. A conversion based on fewer than ten is greyed. Below are the same four counts by ad and by Fit score, and the ad spend, typed in per month.

## Where things are on screen
| Menu | Screen | What it is for |
|---|---|---|
| **Work the leads** | Board | Opportunities by stage, from Call scheduled to Signed |
| | Leads | Switches between All and Good fit (scored well, no call yet: the people worth ringing). A search box finds a lead by name, email or phone. Each row has the phone number, which rings it when clicked. Clicking a name opens a brief box with their contact details and the progress meter; "View lead" in it opens the full lead |
| | Calls | Switches between Calendar and List. The calendar is a month of every call, paged with ‹ Today ›; the list shows upcoming calls soonest first, then past calls most recent first. Each call is a chip on its day: grey booked, amber outcome needed, green good call, red no-show or not a good call, struck through cancelled. Clicking one opens the lead pop-up, where the call is managed. Show rate at the top |
| **How it is going** | Numbers | The four KPIs; Form drop-off inside it |
| **Set it up** | Emails | Every email, in five folders |
| | Settings | Brand and pages · Form · Media · Calls · Emails · People |

Emails and Settings are in the menu for the owner only; a consultant or client sees Board, Leads, Calls and Numbers. Every setting lives under Settings. Ad spend is the one exception: it is on Numbers, because it is typed in monthly alongside the figures it feeds.

The menu runs down the left-hand side as icons, with their names beside them on a wide screen; the three groups are separated by thin lines. View site, Switch brand and Log out sit at the bottom of it. "View site" opens the brand's public page. Logged in, the public pages show a strip to switch which lead you are viewing as.

## What is a stand-in today
| Real thing | Today |
|---|---|
| Email | A test mailbox at `/dev/mailbox` |
| Database | Its own database in the `.data` folder. Given a database address (`FRANOS_DATABASE_URL`), franOS uses the hosted database on Neon instead; that is how it will run once hosted. A copy of this computer's data was put on Neon on 15 Nov |
| Backups and alerts | On the server only. The database is copied in full every night to private storage at Amazon and kept for 35 days; the server itself is snapshotted daily. Adam is emailed if franOS stops answering for about six minutes and does not recover by itself, when it comes back, and if a nightly backup fails. Amazon separately emails him if the server itself stops. The scripts are in `web/scripts/server` |
| Server | From 15 Nov a copy of franOS also runs on a small Amazon server in Stockholm (`16.192.105.23`), at `https://crm.franchiseright.co.uk` (since 16 Nov; the first address, `refresh.franchiseright.co.uk`, still works and is where Amazon posts bounce reports and where email is sent from), on the Neon database. It answers only to Adam's own internet connection for now, apart from the address Amazon reports to. Its passwords sit in a settings file only the server's administrator account can read, sent straight from AWS; the sign-in secret was made on the server and never leaves it. It sends real email through Amazon SES using a key that can only send email; on Adam's computer email still goes to the test mailbox. While Amazon keeps the account in test mode, only addresses Amazon has verified receive anything. The key for reaching the server is on Adam's computer at `.ssh/franos_server` in his user folder, outside the project |
| Zoom | **Real, when franOS is started with `npm run dev:zoom`:** booking a call creates a meeting on Franchise Right's own Zoom account, moving or cancelling the call does the same on Zoom, and afterwards franOS asks Zoom whether the call happened. Started with plain `npm run dev`, a stand-in hands out made-up links. The account is on Zoom Pro from 16 Nov 2026 and records every meeting franOS creates: one speaker-view video, a combined sound file, a sound file per person and a transcript. **A lead call keeps its transcript only:** once the transcript is saved, franOS removes the video from Zoom (it goes to Zoom's bin for 30 days); if the transcript is late it asks again every 15 minutes for 3 hours. The franos Zoom app was allowed to delete recordings on 16 Nov 2026, and removing a test video was checked the same day |
| Meta | **Test mode only.** Lead, Schedule, Good call and Signed are recorded, and for a brand with a dataset and a test code they are sent to Meta's "Test events" tab. Nothing real is sent until a brand is switched to live at go-live |
| The consultant's calendar | Working hours set in franOS; it cannot see other appointments |
| The internet | Runs at `localhost:3000` on Adam's computer |

## Recording sessions
For filming people who are not leads: a franchisee's testimonial, a franchisor interview, or any other recording (`docs/21-recording-sessions-spec.md`).

- **Calls > Sessions** (owner only) has a booking link for each kind, with a copy icon, and a table of every session. The link carries a code, so it cannot be guessed.
- **The person opens the link,** gives their name and email, ticks the permission box, and picks a time. They get a confirmation, a reminder the day before and an hour before, and a page where they can move or cancel. The owner is emailed too.
- **Times:** Monday to Friday, 9am to 5pm, an hour long, at least a day ahead, up to three weeks ahead. A session blocks lead-call times in every brand, and a lead call blocks session times, because one person hosts them all for now.
- **Afterwards** franOS saves the recording link, the transcript and each person's own sound file against the session. The whole recording stays in Zoom. If it is not ready, franOS asks again every 15 minutes for 3 hours, then marks the session "Needs a look".
- **Deleting a session** removes it from franOS and its recording from Zoom.
- A session is never a lead: no Fit score, no emails sequence, nothing sent to Meta.

## How it is checked
277 automatic tests (`npm test` in the `web` folder) cover the rules above, including that one brand cannot see another's data. Each step was also walked through by hand in a browser on a throwaway database.
