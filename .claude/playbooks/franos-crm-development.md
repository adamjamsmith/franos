
# franOS CRM development

Full reference: the franOS Developer Manual (Claude Doc) https://claude.ai/artifact/WZbHoRVccvnDMfwbZC9HHa. Read the relevant section before changing anything; update it after.

## Working with Adam
- Focus is developing the TEMPLATE, not launching or onboarding a client. Placeholder content, calendar location, franchisor user and Meta test code are onboarding items: note them, don't fix them.
- One step at a time, short answers, simple basic questions, lists in chat. Don't over-engineer.
- Prompts for the GHL workflow AI: copy-paste ready, 750 characters or fewer. Always check what it built (it has skipped branch conditions before).
- Messages are voice-dictated: read for intent, not exact words.
- Test UI code (sheet side panels) in a browser before sending it.
- **Save as you go (standing rule).** Whatever franOS work produces goes into this playbook before the session ends, without being asked: new tabs, columns, custom values, workflows, code locations, decisions, gotchas and open items. Code itself lives in the Project docs and Adam's folder (see Where things are), not in this playbook; the playbook says where it is and how it works. Update the Developer Manual too.

## Why franOS exists
- Gets established UK franchise networks (under £25k, Start Up Loan fundable, local services) more franchisees like their best ones.
- Testimonial interviews of top franchisees run as Facebook ads, and attract similar leads. A matching service.
- Success = a signed franchisee for under £1,000 (ideally under £500).
- Evidence: leads starting in 0–3 months who read the prospectus, next steps and questions and booked a call went ahead about 70% of the time.
- Journey: Ad (interest) → Form (sign-up and qualification) → Prospectus (trust) → Call (sale) → Next steps (the future) → Questions (warming) → Signed. Emails are touch points throughout. The order can vary, so logic checks what happened, not the sequence.
- The franchisor uses only Contacts, the Opportunities board (Latest Status and notes) and the Calendar.

## Where things are
- Template: FR Template sub-account, location GaDVrdepbzPI5fiyO1xK (holds Local Treasures placeholders). Live site: localtreasure.net (pages /lp-home, /video/vt1-long … /video/uc5, /thank-you-1, /thank-you-2, /call, /prospectus, /next-steps, /questions).
- Clients live on franOS: Oven Rescue (Charlie and Mark): location B21anNYKWsWVn1Tx6FAG, site https://crm.ovenrescue.uk, Content Manager sheet 1YiucKIr8ET5Uglbezkb7L8_ggEAJQxTaxD1aEt3ECGQ (shared as Anyone with the link: Viewer, which the video pages need).
- Inventory: about 131 custom values, 49 custom fields, 38 tags, 21 workflows, 55 trigger links, 1 form (LP-Form), 1 calendar (Discovery Call), 1 site "Landing" (22 pages), 1 pipeline (Call Now → Call Scheduled → Interested → Closing → Won).
- Apps Script "franOS Sync" (standalone, adam@franchiseright.co.uk): KPI dashboard sync, plus a franOS Inventory file (dumpInventory). Use cfg_() and api_(). Tokens live in Script Properties only.
- franOS Content Manager: a Google Sheet per client with its own bound Apps Script (template: "franOS Content Manager – FR Template"). Never paste its script into franOS Sync: a standalone project cannot show menus.
- **Latest code (edit from these, save back after every change):** Project docs in the Oven Rescue project, with copies in Adam's Oven Rescue folder (C:\Users\Adam Smith\Documents\websites\Oven Rescue): `claude/franos-content-manager-Code.gs` (Content Manager script) and `claude/franos-video-page.html` (video page Footer Tracking Code). Always edit from that copy, never from memory. After a change: give Adam the whole file to paste into every client sheet and FR Template's sheet (Extensions > Apps Script, replace Code.gs, save), then write the new version back to that doc. If the doc can't be reached, ask Adam to paste the code from Extensions > Apps Script.
- GHL media library: Assets > Brand, Prospectus, Next Steps, Questions, Site, Thumbnails - Page, Thumbnails - Email, Videos, Archive. Root also has Template Images, CSS, Header Images.
- **Document pages (/prospectus, /next-steps, /questions) each have two links, set in two different places:**
  1. **Shown on the page:** a Custom Code block with `<iframe src="{{custom_values.<key>}}" style="width:100%; height:100vh; border:0; display:block;">`. The value is a display version Adam hosts on Google (Drive or Docs link ending `/preview`, no tracking parameters), set in Content Manager > General > Documents: Prospectus link = `A-ProspectusView`, Next steps link = `A-NextStepsView`, Questions link = `A-QuestionsWebView`. The file must be shared "Anyone with the link can view". Custom value keys drop the hyphen and are lower case (`A-NextStepsView` → `anextstepsview`), so the iframe key must match exactly or the iframe is blank.
  2. **Downloaded:** the "Download … to your phone or PC" button uses the builder's Download file action, with the file uploaded to GHL and picked by hand in the page builder. It is NOT a custom value, so on a new client it stays on the FR Template's placeholder PDF (location GaDVrdepbzPI5fiyO1xK) until re-picked. Questions needs a PDF too (export the Google Doc as PDF, `<Brand> - Prepared Questions V1.0.pdf`).
  - Launch check: open each page, confirm the iframe shows the client's document and the download gives the client's file (not a GaDVrdepbzPI5fiyO1xK URL). When a document's version changes, update both: the Google display file and the GHL download file.
- **Document pages (/prospectus, /next-steps, /questions) each have two links, set in two different places:**
  1. **Shown on the page:** a Custom Code block with `<iframe src="{{custom_values.<key>}}" style="width:100%; height:100vh; border:0; display:block;">`. The value is a display version Adam hosts on Google (Drive or Docs link ending `/preview`, no tracking parameters), set in Content Manager > General > Documents: Prospectus link = `A-ProspectusView`, Next steps link = `A-NextStepsView`, Questions link = `A-QuestionsWebView`. The file must be shared "Anyone with the link can view". Custom value keys drop the hyphen and are lower case (`A-NextStepsView` → `anextstepsview`), so the iframe key must match exactly or the iframe is blank.
  2. **Downloaded:** the "Download … to your phone or PC" button uses the builder's Download file action, with the file uploaded to GHL and picked by hand in the page builder. It is NOT a custom value, so on a new client it stays on the FR Template's placeholder PDF (location GaDVrdepbzPI5fiyO1xK) until re-picked. Questions needs a PDF too (export the Google Doc as PDF, `<Brand> - Prepared Questions V1.0.pdf`).
  - Launch check: open each page, confirm the iframe shows the client's document and the download gives the client's file (not a GaDVrdepbzPI5fiyO1xK URL). When a document's version changes, update both: the Google display file and the GHL download file.
- **Document pages (/prospectus, /next-steps, /questions) each have two links, set in two different places:**
  1. **Shown on the page:** a Custom Code block with `<iframe src="{{custom_values.<key>}}" style="width:100%; height:100vh; border:0; display:block;">`. The value is a display version Adam hosts on Google (Drive or Docs preview link, plain, no tracking parameters), set in Content Manager > General > Documents: Prospectus link = `A-ProspectusView`, Next steps link = `A-NextStepsView`, Questions link = `A-QuestionsWebView` (e.g. the questions doc's `/preview` URL). The file must be shared "Anyone with the link can view". Custom value keys drop the hyphen and are lower case (`A-NextStepsView` → `anextstepsview`), so the iframe key must match exactly or the iframe is blank.
  2. **Downloaded:** the "Download … to your phone or PC" button uses the builder's Download file action, with the file uploaded to GHL and picked by hand in the page builder. It is NOT a custom value, so on a new client it stays on the FR Template's placeholder PDF (location GaDVrdepbzPI5fiyO1xK) until re-picked. Questions needs a PDF too (export the Google Doc as PDF, `<Brand> - Prepared Questions V1.0.pdf`).
  - Launch check: open each page, confirm the iframe shows the client's document and the download gives the client's file (not a GaDVrdepbzPI5fiyO1xK URL). When a document's version changes, update both: the Google display file and the GHL download file.

## Architecture (workflows talk through tags and fields)
1. Inputs: LP-Form, trigger link clicks, Discovery Call bookings.
2. Scoring:
   - Lead Qualification sets Level, l* tags and temp-cold.
   - Interest & Temperature sets temp-* tags, opened dates and interest tags.
   - Lead Status sets warm/hot, for timing 0–3 months only.
   - Four tracking workflows write last-clicked fields and notes.
3. Actions:
   - Meta Sender (CAPI).
   - Email Chain, CTA Chain, Call Chain, Testimonial Follow-up.
   - Avatar Call Now, Call Logic, Call Now and Call Outcome nudges.
4. Franchisor sets Latest Status → Status Router.

## Scoring rules (three separate scales)
- **Level** (form, set once):
  - Ideal 10 `l4-ideal` = Timing Ready + Role Strong + Experience Strong + Why OK
  - Avatar 5 `l3-avatar` = Timing Ready + Role and Experience Strong or OK
  - Ready 2 `l2-ready` = Timing Ready
  - Broad 1 `l1-broad` = everyone else
  - Grades are edited per client.
- **Temperature** (any timing):
  - Warming = prospectus OR call
  - Warm = prospectus AND call
  - Hot = Warm AND (next steps OR questions)
- **Lead Status** (0–3 months only): `warm` = call + prospectus; `hot` = Warm + nextsteps or questions. These plain tags are NOT legacy. Lead Status sends no Meta events.

## Pipeline: Status Router (Latest Status)
- No Show: tag no-show, back to stage Call Now.
- Rescheduled: stage Call Scheduled.
- Interested: stage Interested.
- Closing: stage Closing.
- Won: tag signed → removed from Email Chain → Signed Date → note → status Won (Meta Purchase).
- Not Interested: status Abandoned (decided; no Lost stage).
- Every branch then bakes Latest Status into a note and clears it.

## Meta (keep as is)
- Meta Sender is the only CAPI sender. Events:
  - Lead = l1-broad
  - Schedule = appointment
  - Warm = temp-warm → SubmitApplication, value = Level
  - Hot = temp-hot → CompleteRegistration, value = Level, GBP
  - Purchase = signed, value = franchise fee
- meta-*-sent tags mean an event was already sent.
- Test code TEST34474 stays in the template; remove it per client at launch.
- Launch check: every Meta Sender step (Lead, Schedule, Warm, Hot, Purchase) needs the client's own dataset ID and CAPI access token, and an empty test code. The snapshot carries the template's over: Oven Rescue still had dataset 2169589110296498 until 10 Nov 2026. Generate the token in Events Manager > the client's dataset > Settings > Conversions API. Then do one real sign-up and confirm a server Lead event on the client's dataset.
- Per client: the site head gets only the browser pixel (`fbq('init', '<dataset id>'); fbq('track', 'PageView');`). Lead and the rest go by CAPI from Meta Sender. Oven Rescue dataset "Oven Rescue" = 1550679289368569.
- META_TOKEN (franos system user) is ads_read only: it can't read draft ads or dataset stats, so check those in Ads Manager by eye.
- Campaign set-up (Oven Rescue, Nov 2026):
  - Campaign "(franOS) Oven Rescue - Calls" (franOS in the name for the KPI filter), conversion event Schedule.
  - Ad set "Available Locations v1". Ads "<Name> Ad 1".
  - URL https://crm.ovenrescue.uk/, URL parameters `utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}` (utm_content lands in the contact's ad field and the dashboard).
- Franchise ads are forced into the Employment special category:
  - no postcode targeting or exclusions
  - no age or gender targeting
  - cities need a 17 km (10 mile) minimum radius
- So target available areas by inclusion: whole regions or counties (no radius) plus cities at 10+ miles.
- Bulk paste mismatches villages and neighbourhoods. Get Meta's exact names from the adgeolocation search API (e.g. "Borough of Darlington", "Falkirk Council", "Isle of Anglesey") and give Adam a click-to-copy page (Oven Rescue: artifact "Oven Rescue ad locations", 88 entries).

## Emails
- Codes: PT/PF = prospectus true/false, CF = CTA Chain, CC = Call Chain, EC = Email Chain, VT = video testimonial, UC = useful content.
- Trigger links are named destination-code (book-ptcf2, prospectus-pfcf3, nextsteps-ptcc1). Unused links book-ptcf5 and book-ptct1–5 are kept for future use.
- Email Chain (tag lead): EC-1–25, then Wait 1000 Days.
- CTA Chain (tag lead): has call → end. Otherwise PFCF-1–4 or PTCF-1–4.
- Call Chain (appointment confirmed, Discovery Call):
  - PTCC/PFCC on booking, 3 days, 1 day, 12 hours and 1 hour before, then CC6 10 minutes before.
  - Waits skip messages whose time has passed.
  - GHL removes the lead from appointment waits on cancel or reschedule.
- Calendar notifications send the cancellation and reschedule emails. Calendar reminders are off; all reminders come from the Call Chain.
- Next Steps & Questions Link Clicked: one branch per link (22), each must check its own link name.
- CTA – Testimonial Follow-up ("Want to talk to this person?") is started by Testimonials Viewed. Oven Rescue: switched off for VT3 (10 Nov 2026). In emails VT1 = David, VT2 = Trevor, VT3 = Mike. When prospects are offered a franchisee to speak to, use Dave (David Sandelands), never Trevor.
- Test with test-email-vt, test-email-uc and test-email-chains, then check the activity log.
- Email Chain builder (franOS Inventory.gs, Nov 2026): EC_EMAILS (26 entries, EC-00 to EC-25) → ecHtml_ → ecUpsert_ (finds by name or the first 6 characters, so renames update in place). Images come from Media Storage › Email Chain by file name (ecImages_ keeps the newest and strips GHL's " (1)" suffix). Per-email options:
  - `imgLink`: wrap the core image in a link (EC-00 → the prospectus trigger link).
  - `noPs`: remove the next_step PS blocks.
  - `band` absent → the booked_from testimonial band is cut (ecCut_ removes a hidden-span compare block by depth counting).
  - Every email gets a VSL box before the footer (ecVsl_: brand-green box, VSL.png thumbnail, "Watch the Video" → the uc1 trigger link, never the thank-you page).
  - From name/email come from custom values (Oven Rescue: "Mark from Oven Rescue").
  - Never put a backslash in a template name.
  - The header button and PS still switch automatically from contact.next_step.
  - EC-00 (the prospectus email; Adam calls it E1) ends with a bold funding line: full funding through a government-backed Start Up Loan of up to £25,000. Added 10 Nov 2026 because funding is the biggest objection.
  - To rebuild specific emails, temporarily change buildEmailChainTest's list (e.g. [0, 1]), run it, then set it back to [1].

## Content Manager
- Tabs: Home (location, website address, last pull/push), General, Design, Emails, Testimonials (quote/name/town → HTML built on push), Videos (VT people + grid: title, video URL, page thumb, email thumb, Open page link, Priority), Tech (Meta dataset ID, test code; token never shown), Other, Log, Video Page (made by hand, not by the script: wording for the /video/ pages in sections Book a call (text, heading, calendar link, call page link), Buttons and labels, Sections, Footer, Testimonial people (towns), Questions, Reviews; read by the website, never pushed); hidden _cells (cell → custom value, last value, GHL id, media folder) and _media (folder|name → URL, tpl|custom value → template URL, folder|name → folder id).
- Script properties: GHL_TOKEN (custom values read + write, medias.readonly, medias.write), LOCATION_ID (franOS > Set up).
- Menu: Pull from GHL (also reloads image lists; warns about unpushed edits), Push changes to GHL (lists changes, sends only those, creates missing values), Upload images, Show head code, Set up.
- Images: 41 slots are dropdowns of one media folder by media name, "Template" first (FR Template's public image URL). Brand: logo, email header logo, franchisor photo. Prospectus, Next Steps, Thumbnails - Page (18), Thumbnails - Email (18). Folders are found inside Assets (searched up to 4 levels).
- Upload images: side panel, one folder, many images, a name each; a single upload goes into the selected image cell. Videos are pasted as URLs (Apps Script upload limit about 50 MB).
- Open page links use Home!B5, filled from Brand Website URL unless typed.
- Pull rebuilds every CM_LAYOUT tab from GHL (it clears the whole tab), so a sheet-only column survives only as a `keep` column on a grid. The Videos grid has one: Priority (column I, 1st to 15th, on the TY, VT and UC rows). The website reads it, it is never pushed, and Pull keeps it. The Video Page tab is not in CM_LAYOUT, so Pull never touches it.
- Video pages (/video/...): one script in the Landing site's Footer Tracking Code builds the page from the sheet (Videos!A1:I60, _media, Video Page tab) over gviz CSV; no push needed. The TY row is the intro video (the section further down the page); it is not in the strip. To show the thank-you video in the strip, put the same video in a UC row (Oven Rescue: UC1 = "Introduction to Oven Rescue", priority 1st, page /video/uc1); a UC with the same URL as the intro isn't listed twice. When the real VSL is uploaded, update both the TY and UC1 rows. Clicking a strip card, "Up next" (countdown or Play now) or "Watch the full testimonial" opens that video's own page (/video/<id>?play=1, so every view is a tracked page visit; play=1 is stripped from the address and the video tries to autoplay, which some browsers block until a click). Never link a video to the thank-you page: it would fire the sign-up tracking. Watched videos are kept in sessionStorage across pages and go to the end of the strip. The "Schedule a call" button on each video is brand green, slides up after 5 seconds of playing and then stays (also when paused); it sits above the play bar and drops near the bottom when the bar is hidden (a `frp-idle` class on the stage, set 2.5s after the mouse stops or 0.6s after it leaves while playing). In a hidden browser pane, CSS transitions don't advance, so check positions with transitions turned off. To edit it, read the live copy from a /video/ page (Nuxt payload, globalBodyTrackingCode), check its SHA-256 matches your copy, change it, and test by injecting it on a non-video page with history.pushState before Adam pastes it.

- **Thank-you pages use the same layout (8 Nov 2026).** The same Footer Tracking Code script also builds /thank-you-1 and /thank-you-2:
  - /thank-you-1 (after sign-up): main video = Videos tab Thank-you (TY) row; heading = Video Page "thank-you heading" (else the TY title). Calendar section and Schedule buttons as on the video pages. The intro block is skipped (it is the main video).
  - /thank-you-2 (after booking): main video = Thank-you call (TYC) row; heading = "thank-you call heading" (else the TYC title). No calendar section; every Schedule button becomes Video Page "next steps button" (default "Read your Next Steps", small screens "next steps button (small screens)") linking to "next steps link" (default /next-steps).
  - The main video is never listed again in the strip or lists (matched by id or URL). The page's own tracking still runs (the script only hides the builder content).
  - Test without loading a real thank-you page (it fires the sign-up tracking): on another page, history.pushState to /thank-you-1 and run the new code.
  - Oven Rescue: UC1 still holds the old intro video while TY has the new VSL, so update UC1 to the same URL.

- **Thank-you pages use the same layout (Nov 2026).** The same Footer Tracking Code script also builds /thank-you-1 and /thank-you-2. Their wording lives in a "Thank-you pages" section at the bottom of the Video Page tab (rows 122+; the tab's grid was extended past 120 rows):
  - /thank-you-1 (after sign-up): heading = "Thank-you heading" (the TY video title is ignored), then a "Thank-you prospectus button" → "Thank-you prospectus link" (default /prospectus), then "Thank-you text" above the video. Main video = Videos tab Thank-you (TY) row (the VSL). It autoplays muted with a pulsing "Sound button" (default "Click to turn on the sound") that unmutes and restarts it; browsers only allow muted autoplay. Calendar section and Schedule buttons as on the video pages; the intro block is skipped (it is the main video).
  - /thank-you-2 (after booking): main video = Thank-you call (TYC) row; heading = "Thank-you call heading" (else the TYC title) and "Thank-you call text". No calendar section; every Schedule button becomes "Next steps button" (default "Read your Next Steps"; small screens "Next steps button (small screens)") linking to "Next steps link" (default /next-steps).
  - The main video is never listed again in the strip or lists (matched by id or URL). The VSL lives only in the TY row: Oven Rescue's UC1 ("Introduction to Oven Rescue") was cleared so it is no longer listed as content. The /video/ pages still show it in their intro block. The page's own tracking still runs (the script only hides the builder content).
  - Test without loading a real thank-you page (it fires the sign-up tracking): on another page, history.pushState to /thank-you-1 and run the new code.

## Website CSS (nothing uploaded)
- The head tracking code is pasted once in the template and holds only placeholders:
  1. Google Fonts link from brandfont + sbodyfont.
  2. {{custom_values.sbasecss}}: the whole franOS base CSS (rules and classes, variables only).
  3. :root variables: --brand (smainc), --on-brand (sonbrand), --darkbg (sdarkbg), --tint (stint), --btn-black (sbtnblack), --radius (sradius), --font-heading (brandfont), --font-body (sbodyfont). Hover colour is mixed from --brand.
  4. {{custom_values.scustomcss}} for one-off CSS.
- Rebrand = edit the Design tab and push. Change rules for all brands = edit the Base CSS cell and push per client.
- Paste multi-line CSS into the formula bar, not the cell (Sheets splits it across rows).
- Base CSS classes: darkbg, brandbg, lightbg, ffooter, center, center-mobile, left-mobile, narrow, round, shadow; buttons btn-white, btn-black, btn-line (never btn-dark/btn-light: GHL uses them).
- New client: snapshot copies head code + custom values; make a blank sheet, paste the script, add GHL_TOKEN, Set up, Pull, fill, Push.

## Changing franOS safely
1. Find every user of a tag, field, custom value or trigger link before changing it.
2. Change FR Template only.
3. Never rename keys or tags in use: add new, move references, delete old.
4. Test with a fresh contact and the test workflows. Check tags, Temperature, Lead Status and the activity log.
5. Update the manual and this playbook.

## GHL gotchas
- The workflow builder is an iframe: review it by screenshot. Trigger links and settings pages read as text.
- Dropdowns often need two clicks.
- In the email editor, click the link, then the link button, to see its target.
- Appointment Status trigger filters: event type is only Any, Normal or Recurring. There is no "Rescheduled" option.
- Custom values render in website head code (style blocks work there) but not inside an uploaded .css file. Uploaded media files get cached.
- Live pages are cached: check changes with ?v=2 (new number each time) or wait and Ctrl+F5.
- Media API: GET /medias/files needs type=folder or type=file; listing without parentId only returns top-level folders.
- A long custom value (about 13,000 characters of CSS) is accepted.
- Snapshots copy everything, including test codes, tokens and placeholders.
- In sheet side panels, never name an inline handler function "list" (it clashes with the input's built-in list property).
- Never read browser storage for tokens. Never repeat the Meta token.
- Calendar redirect URL merge fields (read from the booking widget JS, Nov 2026): the widget merges the URL with the booking's cookie payload, and every key of that payload goes under `contact.`, including the appointment. So appointment data is `{{contact.appointment.only_start_date}}`, `{{contact.appointment.only_start_time}}`, `{{contact.appointment.start_time}}`. `{{appointment.*}}` comes out empty. Missing keys become "". An empty `?name=` is filled with the contact's name. The /thank-you-2 call details box reads `?name=&with=&date=&time=` and falls back to "thank-you call text" when date is empty. Oven Rescue redirect: `https://crm.ovenrescue.uk/thank-you-2?name={{contact.first_name}}&date={{contact.appointment.only_start_date}}&time={{contact.appointment.only_start_time}}&with={{contact.appointment.user.first_name}}` (the `with` key isn't confirmed yet; if it comes out blank, the box just drops it).
- GHL's video element plays inside an iframe (`.c-video .iframe-container iframe`, which GHL sizes to height:100% of a 16:9 box). Never force `iframe { height: auto }` in CSS: the player shrinks to the browser's default 150px and the video sits small at the top of a black box. Base CSS section 8 (Sizing) now gives iframes max-width only, plus `.c-video .iframe-container iframe { height: 100% !important }`.

## KPI dashboard per client (Oven Rescue set up 9 Nov 2026)
- Copy "franOS KPI Dashboard (Template)" (1-xOwHFJCAUDW7PMVZGsmyRwdsM8bVzAIOZAw2pvs29A). Careful: that file IS Local Treasures' live dashboard, so never rename it or clear its data. Recolour to the brand, fill Settings B3 name, B9 fee, B34 GHL location, B35 Meta ad account, B36 campaign filter (a CONTAIN match on campaign name; Oven Rescue uses "franOS", so old spend is ignored and new campaigns must have franOS in the name). Clear Contacts A2:S. Hide Field map, Contacts, Spend, Settings.
- Sharing (same as Local Treasures): Anyone with the link = Editor; every tab is protected except the Dashboard date pickers (H2, J2:K3), so viewers can only change Leads from / Date range.
- franOS Sync (standalone, owned by adam@franchiseright.co.uk, so it never shows in a sheet menu): add the client to CLIENTS (Oven Rescue = CLIENTS[1], tokenProperty OR_TOKEN), add the Script Property, run syncAll. The trigger runs syncAll every 30 minutes for all clients (turnOnEvery30Min in Code.gs, 12 Nov 2026). Claude can edit and run it in the built-in browser once Adam is signed in as adam@franchiseright.co.uk; Adam pastes tokens himself.
- Meta spend: one shared META_TOKEN from the "franos" System User in the Franchise Right portfolio (825830372158159), app "franOS Sync" (1706826631004753). Per client: the client's portfolio shares its ad account with Franchise Right (Partners, needs a second admin to approve), then Franchise Right > Ad accounts > the account > Assign people > franos, View performance. Error "(#200) Ad account owner has NOT grant ads_read" = this assignment is missing.
- **Leads from: franOS ads / Old campaigns / All leads (Oven Rescue dashboard, 11 Nov 2026; not yet in the template).** Contacts!U (Source) is an array formula: campaign contains Settings B36 (case-insensitive) → "franOS ads"; campaign in Settings B39 (exact names, separated by |) → "Old campaigns"; other ad name → "Facebook other"; else "Other". Settings B11 turns the Dashboard H2 pick into that value ("*" for All leads). Contacts!V (Call date) parses Call booked (L) to a date (unparseable → 1 Jan 1950).
  - Old campaigns: every old lead counts whatever its created date; the date range applies to call dates (V) instead. Spend = Settings B40 (all-time spend typed from Ads Manager: Oven Rescue £15,197.67 over New Franchise Ads, May 28th Oven Rescue, [31/03/2025] Promoting… form, New Franchisee Ads #1). The funnel uses all leads (they have no Level). Rows 52–53 show "Booked/Showed before franOS" from old pipeline stages (Settings B41/B42). Oven Rescue at build: 3,979 leads, £3.82 each, 87 booked before franOS (2%), 17 showed.
  - Date windows live in Settings B45:B52 (lead from/to, call from/to, and previous-period versions); every Contacts-based Dashboard formula uses them instead of B5/B6. Month by month (rows 81+) is unchanged.
  - Pipeline now (Dashboard B56:K57) counts only contacts matching the Leads from pick (COUNTIFS on Contacts!U = Settings B11), so old-system bookings (e.g. John Peachey) don't show under franOS ads. The funnel (row 14) uses all leads for the chosen source, not only Ideal & Avatar; E15 is "% of leads". (12 Nov 2026, Oven Rescue only.)
  - Open: confirm the Call Booked field's format gives a real date in V after the next booking, and that an old lead booking now gets Call Booked set. Copy the change into the KPI template carefully (it is Local Treasures' live dashboard).
- franOS Inventory.gs now has dumpInventoryOvenRescue() (dumpInventoryFor_(i)) and inspectContactOR() (read-only: a contact's tags, appointments with calendar ID, opportunities).
- GHL menu link: agency Settings > Custom Menu Links, iframe, URL `https://docs.google.com/spreadsheets/d/<id>/edit?rm=minimal#gid=0`, sub-account sidebar only, that one sub-account, all roles. Do NOT use agency Custom JS to reorder the menu or redirect the landing page: it broke other sub-accounts ("We couldn't load this link") and was removed. The link stays at the bottom of the menu.

## Oven Rescue specifics (9 Nov 2026)
- Oven Rescue's GHL is in Charlie's "Epic Brands" agency (Leather Hero Franchise = location GLVrnbBnYSHujl73tYSj there), not Adam's franOS agency.
- Calendar: the site books into the existing "Oven Rescue Franchise Q&A" calendar (wOUdTuoCLBF7dj9IBUyD; shared by Charlie and Mark, one static Zoom link, redirect /thank-you-2), set up like Leather Hero's. Adam re-pointed the five booking workflows (Call Chain, Call Logic, Interest & Temperature, Meta Sender, Call Outcome Nudge) from Discovery Call to it on 9 Nov. Discovery Call is unused. To do: draft "Appointment Confirmation + Reminder" (double reminders), check Call Chain emails contain the Zoom link, run a booking test.
- Legacy Oven Rescue workflows (10 Nov 2026): All Franchise Enquires, Clicked Prospectus: Didn't Act and Didn't Open Prospectus are in draft. V1-V3 NURTURE EMAIL WORKFLOW Sept26 is being switched off: Emily asked to merge it into the Email Chain and Adam declined. Their own B2B workflows (B2B Email Cold Lead Flow, Hard Bounce Removal- B2B emails) stay on. B2B Email Cold Lead Flow triggers on Contact created, so it has a guard that keeps franchise leads out (they have answered the funding question). Two GHL limits apply here: custom-field trigger filters only offer "equals", and franOS adds the `lead` tag after Contact created has already fired, so a tag filter on the trigger can't catch it. Facebook instant-form leads (fb_lead_form) bypass franOS scoring, so new ads must go to the landing page.
- Suggested additions (not built yet): smart lists Hot, Warm, Ideal & Avatar, Call booked, No-shows, Signed, New this week; contact columns Level, Temperature, Timing, Funding, Call booked date, Ad; Level/Temperature on opportunity cards.

## Launch test protocol (run before every client goes live)
Proves the whole funnel end to end. Oven Rescue passed it on 9 Nov 2026.

**Test leads.** Six sign-ups, one per scoring path and branch:

| Lead | Profile | Expected level | Then |
|---|---|---|---|
| T1 | Ideal | 10 | Clicks the prospectus, books, clicks next steps + questions |
| T2 | Avatar | 5 | Clicks the prospectus (opportunity created) |
| T3 | Avatar | 5 | Books |
| T4 | Ready | 2 | Arrives with ad UTMs (utm_content = "Trevor Ad 1") |
| T5 | Broad | 1 | Books |
| T6 | Any | – | Checks the form redirect (always /thank-you-1) |

- **Identities:**
  - Emails: plus-addressing `adam+<brand>-tN@franchiseright.co.uk`, read through the Gmail connector. Gmail dots don't work on that account.
  - Phones: random valid UK mobiles (e.g. 07456100101–106). GHL rejects Ofcom 07700 900xxx numbers.
- **Who submits:** Cloudflare Turnstile on the GHL form and booking widget blocks automation, and Claude never does the check. Claude gives Adam prefill links (`?first_name=&email=&phone=` plus the answer fields, and utm_* for T4) with the radio buttons to tick. Adam submits and books; Claude checks everything else.
- Never load real thank-you pages yourself (they fire tracking).

**After each sign-up, check** via franOS Sync (temporarily prepend into listEmailTemplatesOR, Ctrl+S, Run, read the Execution log, restore the line exactly):
- `/contacts/search` → tags (l1–l10 level, lead, meta-lead-sent), custom fields (Level, Temperature, next_step, utm fields).
- `/opportunities/search?location_id&contact_id` → an opportunity only after Avatar+ reads the prospectus or anyone books (by design). Stage and status.
- `/contacts/{id}/appointments` → the booking is on the right calendar.
- Gmail → EC-00 and PFCF-1/PTCF-1 arrived from the right sender. The booking email (PTCC1/PFCC1) has the Zoom link.
- Link clicks: open the trigger links from the test emails (prospectus, next steps, questions) and check temp-warming → hot, the meta-schedule-sent and meta-hot-sent tags, and next_step updates.
- /thank-you-2 shows the call date and time (calendar redirect merge fields above).

**Status Router.** On a booked test opportunity, `PUT /opportunities/{id}` with customFields Latest Status (Oven Rescue field Lmc6EQOVSGHkCw0aI1tT) set to:
- Won → Won, status won, tag signed
- No Show → Call Now, tag no-show
- Not Interested → abandoned

Check that Latest Status is baked into a note and cleared.

**Dashboard.** Run syncClient_(cfg_(CLIENTS[i])) and check the test rows on the KPI dashboard (level, booked, ad).

**Clean-up** (Adam must ask for it first): DELETE `/calendars/events/{id}` for each test appointment, then `/opportunities/{id}`, then `/contacts/{id}`, then re-sync the dashboard.

**Known gaps (Nov 2026):**
- No meta-warm-sent (SubmitApplication) or meta-purchase-sent tags were seen; check the Meta Sender branches.
- Reschedule not tested.
- Self-employed scores as a weak role.
- Dashboard Questions column showed FALSE for a lead who clicked questions.
- Sending domain is the shared msgsndrlk.com (a dedicated domain is optional).
- Remove TEST34474 at launch.

## Emails tab on the KPI sheet (Oven Rescue, 12 Nov 2026)
- franOS Inventory.gs: syncEmails_(c, force), syncEmailsWeekly (Friday 18:00 trigger, turnOnWeeklyEmails), syncEmailsNowOR, emailsResetOR_ (clears the EMAILS_<locationId> Script Property state). Tab "Emails" (protected) + hidden "_email_weeks".
- Sections: 1 workflow totals (sent, delivered, opened, clicked, bounces, unsubscribes) from `GET /emails/locations/{loc}/campaigns/stats/workflow-campaigns/{workflowId}`, Version v3; 2 times sent per subject since EMAIL_START (4 Nov 2026) from `/conversations/messages/export` (channel Email, sortOrder asc, startDate ISO; nextCursor never changes, so loop with a seen-id guard); 3 calls booked by Last Booking Link Clicked; 4 week-by-week diffs (the Friday bake).
- Per-email opens and clicks are NOT possible by API: per-step stats need the workflow action ID (subSourceId), which no public API exposes (a template ID returns zeros). Adam checks those in GHL > workflow > email > Statistics.
- Filters: EMAIL_FROM per location (Oven Rescue mark@ovenrescue.uk; Charlie's B2B/legacy emails send as charlie@), EMAIL_SKIP_WF = /^test-|B2B/i, subjects starting TEST or EC-n skipped. emailSubjectKey_ replaces names and booking dates with [name]/[date].

## Ads placements (Nov 2026)
- Leather Hero and Oven Rescue switched to Facebook Feed only (call quality over cheap clicks). LH: duplicated, original paused as backup. OR: edited in place. Review after 7 days. Placement data comes from Ads Manager UI breakdowns (the session token can't be used for the Graph API).

## Old leads into franOS (Oven Rescue, 11 Nov 2026)
- Goal: send pre-franOS Facebook leads through franOS without firing Meta Lead events. Lead Qualification is form-triggered, so adding `lead` sends no Lead event.
- Workflow "Old Lead → franOS" (de43c585-ac4c-4d83-868c-29a4a6926ee0, published), trigger tag `old-lead`. It sets temp-cold, zeroes the counters, Temperature Cold, Next Step prospectus, Last Activity, Lead Status Cold, Lead Type Nurture, Franchise Fee, a note, then `nurture` and `lead` (last).
- Email Chain: an If/Else at the top. If the contact has `old-lead`: OL-01 Old lead intro, then a Goto to "Wait 1 Days After EC-00" (so EC-01 comes next). Otherwise EC-00. Old leads also get the CTA Chain (Adam: fine).
- OL-01 (GHL template 6af44bbacef83416e7ebf63c) is EC_EMAILS entry n=100 in franOS Inventory.gs; rebuild with buildOldLeadIntro(). Subject "Earn £42,000 cleaning ovens in year one" (the workflow step has its own subject field: set it there too, no asterisk). Body: title + 3 ticks, Hi, intro, disclaimer under the intro, then 1 Charlie's video (uc1 link, never the thank-you page: it fires sign-up tracking), 2 prospectus (plain "36 pages of answers to all your questions." line + 3 ticks + button, mockup right), 3 David/Trevor/Mike videos, book a call, owner quotes linked to their videos, sign-off. Every link is a trigger link. Change only what Adam specifies.
- Who: Contacts!U = "Old campaigns", minus franchise owners, Qualified out, typo emails, and Tibor Bodor plus both Andrew Williams (Adam's call). Booked old leads ARE included ("the hottest"). 3,934 tagged `old-lead-temp` by franOS Inventory functions oldLeadIds_ / tagOldLeadsTemp (resumable, OLD_TAG_I) / cleanOldLeads_ / listOldLeadsLeftOut / removeOldLeadsByName_. Left-out list: "Old leads left out" tab on the OR KPI sheet. Unspam test: rspamd -0.47 (fine).
- Send: smart list "Old Leads" (old-lead-temp, not lead, DND off, not old-lead). Add tags has no drip mode, so a no-trigger workflow "Old lead drip" adds `old-lead`, and contacts go in by Add to Workflow in drip mode: 100 on 11 Nov, then 100 per weekday 9:20–9:30am. Ramp to 200, then 400–500 a day if bounces stay under ~5%.
- Clean-up after the drip: bulk-remove `old-lead-temp`, then delete both `old-lead-temp` entries in Settings > Tags (parallel tagging created it twice; deleting one first may strip it from every contact).
- Apps Script picker gotcha: clicking the function dropdown in the built-in browser often doesn't select. Workaround: temporarily point the already-selected function at the one to run, save, click Run, then restore it.

## Open items
- Copy the 12 Nov dashboard changes (pipeline filter, all-leads funnel, Old campaigns view, Emails tab) into the KPI template carefully (Local Treasures' live dashboard).
- Calls by booking link shows "(not recorded)": Last Booking Link Clicked is empty for bookings so far; check the booking trigger links write it.
- Old leads: check the first batches' opens, bounces and bookings, and that an old lead's booking shows in the KPI dashboard's Old campaigns view (Call booked → V).
- Base CSS iframe fix (7 Nov 2026) is in the Oven Rescue sheet only: copy section 8 (Sizing) into FR Template's Base CSS cell and push, and update any saved copy of the base CSS file.
- Reschedule test: confirm the lead re-enters Call Chain and Call Outcome Nudge (check Enrollment history). Call Outcome Nudge is event type Any; Call Chain is Normal.
- Video pages on a new client (done for Local Treasures, 12 Nov 2026): (1) copy the live Code.gs editor-to-editor (open both bound projects in the browser on script.google.com, read the Oven Rescue Monaco model into localStorage, set it in the client's model, Ctrl+S); (2) copy the Video Page tab with the Sheets API copyTo, rename it, rewrite every brand line (calendar link, hosts, call with, email search, questions, footer copyright, thank-you headings, step texts) and clear Oven Rescue's review screenshots, step images and booking lookup link; (3) clear the template's samplelib.com sample videos in GHL (they show in the strip), then Pull in the sheet and set Priority; (4) share the sheet Anyone with the link: Viewer; (5) give Adam the code with the client's SHEET_ID and `var PHOTOS = {};` to paste into the site's Footer Tracking Code. Test on any franOS site by taking the live script from document.scripts, swapping SHEET_ID, history.pushState to /video/vt1-short, /thank-you-1 or /thank-you-2?date=&time= and eval. Two videos with the same URL hide each other in the strip (sample placeholders).
- The saved Oven Rescue copies are behind the live ones (12 Nov 2026): the live Code.gs (51,168 chars) has the booking lookup web app (doGet, latestBooking_, testBookingLookup), and the live video page script has built-in host photos (PHOTOS by first name: charlie, mark) and the whole-team call card (frp-cavas). Take code from the live site or bound project, not from franos-video-page.html in the Oven Rescue folder, until that file is refreshed. Local Treasures' copy: Design › franOS › franos-video-page - Local Treasures.html.
- Future: copy the base CSS from the template to every client sheet in one go; page links for logos, prospectus image and testimonials; auto Email Chain content; prospectus builder.
