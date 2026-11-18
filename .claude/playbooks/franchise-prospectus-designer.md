
# Franchise Prospectus Designer

You turn signed-off prospectus copy (from the franchise-copywriter playbook) into a designed, clickable A4 PDF for Adam (Franchise Right). The house style is the **Leather Hero (LH)** prospectus, recoloured to the client's brand.

**Reference build: Oven Rescue (OR), 20 rounds, Nov 2026.** On Adam's PC in `websites/Oven Rescue/Claude-Designer/`:
- `Oven Rescue - Prospectus (round 20, 37 pages).pdf`, the finished example (r13 "final proof" is the older 36-page version)
- `Oven Rescue - Prospectus source (round 20).zip`: the HTML, images and fonts
- `prospectus-designer-toolkit.zip`: every build, bake, render and check script (`build_r14`–`build_r20`, `bake_r20b.py`, `render_rN_review.js`), plus `lh.css` / `lh-symbols.html` (the LH styles and icons)

**Start every new brand by staging and unzipping the toolkit and the OR source.** Copy the OR build, then swap the brand, copy and images. Don't rebuild from scratch.

Adam gives feedback by voice, page by page. **"Page N" always means the PDF page number** (bottom-right of the viewer), not the tab number on the page. Read his messages for intent and act on all of it.

---

## 1. Inputs

1. **Signed-off copy:** the copywriter doc.
2. **Asset dump:** `websites/<Brand>/asset-dump/`, in folders:
   - franchisees, in-action, before-after, vans-branding, team-head-office, products-equipment, logos-badges, other
3. **Extra photo folders** Adam points to (e.g. `websites/<Brand>/backup`):
   - List the folder with `device_list_dir` (recursive).
   - Stage it with `device_stage_files` (≤50 files per call).
   - Build a numbered contact sheet with PIL so you can see everything at once.
4. **Brand:**
   - logo (rebuild dark/green masks from it for baking)
   - main colour and accent
   - phone number and booking link (from the client's current prospectus; confirm them)
   - the main contact's headshot
5. **Proof material:**
   - Meta Ads Manager screenshots
   - the brand's locations map
   - a territory map, and review screenshots

Never stop for a missing input. Use a placeholder plus a red note (section 6).

---

## 2. House style

- **Pages:** A4 `section.page`, 210 × 297mm, everything absolutely positioned in mm.
- **Type:** Roboto (woff2 files in the source). Fixed sizes:
  - body 11pt
  - headlines 25–28pt
  - LH tabs and section labels
- **Never let text grow or shrink to fit.** If it doesn't fit, change the layout or ask for shorter copy.
- **Colours:** the brand colour for headings, ticks, buttons and bands. White pages and light-tinted panels.
- **Topic page:**
  - numbered tab and section label top-left
  - headline
  - photo top-right (about 130 × 84mm) faded into the page
  - copy flow
  - footer: "Next Step → Schedule a Call with [contact] (avatar) · [phone]"
- **Spacing:** match the LH pages. Even gaps, nothing cramped, no big empty holes.
- **One call to action per page:**
  - When the copy leaves about 62mm or more free at the bottom, replace the footer with one big green band: "Ready to learn more?", the booking button and the phone button.
  - Never a call button in the copy *and* a band.
  - Leave padding above the copyright line.
- **Links:**
  - Every contents line links to its page (`#id`).
  - Phone is a `tel:` link.
  - Every Schedule button goes to the client's franOS call page, `https://crm.<brand-domain>/call`, with tracking named by **page name, never page number**: `?utm_source=prospectus&utm_medium=pdf&utm_campaign=<brand>-prospectus&utm_content=<page-slug>` (e.g. `funding`, `after-year-one`). Keep a `SLUG` dict per page key; the end-band script must use it too.
  - Full case-study pages link to that owner's **short** testimonial video page, `/video/vtN-short` (same order as the CRM: VT1, VT2, VT3), with the same UTM. Make the photo half and the bottom bar clickable (transparent `<a>` overlays) as well as the Watch buttons.
  - Check the PDF's link annotations with pypdf: no old booking links or YouTube placeholders left.

---

## 3. Page layouts (OR order)

| # | Page | Layout |
|---|---|---|
| 1 | Cover | Locked design, see "Cover (locked design)" in section 4 |
| 2 | Start Your Own… £X | Photo on the right (about 40–60%), strong fade, top-aligned, cut at the knees, owner name label over the photo's bottom edge; price on its own line; ✅ stack |
| 3 | Letter | Plain, no bold, signature image |
| 4 | Contents | Linked list built from the page order |
| 5 | Owners map | See section 7 |
| 6–8 | Full case studies | Layout A |
| 9–12 | Profit, projections, first six months, funding | Stat boxes, tables |
| 13 | 2 owners | Layout C |
| 14–18 | Marketing | Launch items; then the 3-step run in section 11 (ads proof → real owners' spend → choose your budget) |
| 17–19 | Repeat, what you'll do, territory | Territory page reuses the pin map plus the example map and postcode table |
| 20 | 4 owners | 2×2 tiles |
| 21–31 | Fee table, van, reviews, training, support, grow, team, set-up, network, commercial, why choose | Topic pages |
| 32–34 | Package | See below |
| 35 | How do I start? | 8 steps in two columns |
| 36 | Back page | Faint full-page team photo |

**Layout A: full case study (only owners with a real video):**
- The photo fills the top 150mm, with a dark fade on the text side.
- The number is big in lime, with white headline, story line and name/area/started.
- The quote card sits inside the photo, never over a face.
- White stat boxes on the light-green panel.
- Quotes on the left, story on the right.
- Bottom bar: "Hear It From [Name]" + ▶ Watch button, and no Schedule a Call on this page.
- No video means no Watch button and no layout A.

**Layout C: 2 owners per page:**
- Photo on the left, with the name bottom-left on a black fade.
- Green title, black subline.
- Stat boxes stacked vertically.

**4-up:**
- Landscape photo with name and area on a dark fade.
- One-line number headline, a smaller subline, a quote (or stat boxes).

**Van page:**
- A strong branded-van hero.
- Below the ✅ items:
  - a small square of the livery drawing (views arranged 2×2), labelled "Your livery"
  - beside it, a real branded van photo, labelled with the owner's area

**Business Set-Up page:** ✅ items (Company Formation, Your Systems, Your Local Web Page, Your Brand Kit), with the behind-the-scenes photo as the hero.

**Package:**
- Page 1:
  - Hero: a photo of the inside of a fitted-out van, faded left and bottom only.
  - Subline "Everything you need to start. And succeed."
  - Two-column ✅ summary, then items 1–2.
- Pages 2–3: items 3–13.
- Every item:
  - a numbered square, title and line
  - an image on the right, 41 × 36.6mm, flush to the page edge
  - a divider line above it, running from the page edge
- It ends with "Everything You Need to Launch and Grow".

**How do I start:**
- Two columns, generous vertical padding (about 7mm), lines between rows and between columns.
- Each step has a second line.
- A shorter green band below with the booking and phone buttons.

**Back page:**
- The team photo washed out to about 7% strength.
- **The logo baked straight onto it (no white box).**
- "Ready to Start Your [Brand] Business?", booking button, "Or call us on" + phone, contact avatar and email, one owner quote, disclaimer, company address.

---

## 4. Photos

### Cover (locked design, signed off by Adam on Oven Rescue, Nov 2026)

Reference: `bake_r21.py` in the toolkit (OR round 21, Mike Kempe). Every new brand's cover uses this exact recipe. Only the photo and the name label change.

- **Photo:** one real owner standing head to toe in front of his branded van, on the right of the page. Headline, tick list, letter line, contact avatar, awards and disclaimer stay on the left, unchanged.
- **Placement:** scale the photo so the owner is about 205–240mm tall: head just below the header line (~50–70mm down), feet near the bottom (~285–290mm). Eyes at about 140–150mm across. Nudge right until his near arm sits only in the soft part of the fade.
- **Fades, all baked into the JPEG (no CSS):**
  - **Left:** a long smootherstep, starting exactly at the photo's own left edge (`px0 = ex_p - eye_x / s`) and reaching full strength ~42mm later. Starting the fade anywhere else leaves a visible line where the image ends.
  - **Top:** short smoothstep, ~9mm, starting at the header line (36.6mm).
  - **Bottom:** soft fade-out to white around the feet, reaching zero before the photo's own bottom edge.
  - **Interior: fully opaque.** No overall wash, haze or overlay on the photo.
- **Header line and logo** are drawn over the top exactly as before (logo top-left, thin green rule at 36.6mm).
- **Name label:** white box, bottom right (`right:8mm; top:268mm`): owner name in brand green, "[Brand] [Territory]" underneath. Keep it clear of his feet. If it clashes, move the photo, not the label.
- **Clean-up:** paint out personal phone numbers on the van (`inpaint_rect`). Leave business emails. Use full-resolution photos and check the real pixel size first (EXIF-rotated phone photos are often larger than they display). Photos with transparent margins: flatten onto white first.
- Use the photo Adam picks. Confirm who is in it before writing the label (the Derbyshire van photo was Oliver Jones, David's technician, not David).

- **Real, branded photos first:**
  - owners at vans with the logo clear
  - in action: dip tank, AGA on a mat, trays
  - head office, behind-the-scenes filming
  - Illustrations only as a last resort.
- **Crops:**
  - Eyeline on the top third where the photo allows. **Never add white space above a photo to get there.**
  - No heads cut off. Cut at the knees. Zoom in to lose sky.
  - Keep the van branding in shot.
- **Fades:**
  - Long and soft, reaching the image edges, with no hard lines.
  - Nobody faded out.
  - No top fade on photos or maps unless asked.
- **Clean-up:**
  - Paint out owners' personal phone numbers on vans (`inpaint_rect`, cv2 TELEA).
  - Blur campaign names and account IDs on screenshots.
- **Avatars:**
  - Round, with a white border (green ring on the map).
  - Baked on their exact background colour, head centred with space around it.
- **Before/afters:**
  - BEFORE tag white-bordered, AFTER tag green-bordered (1px).
  - None on case study pages.
- **Phone photos:**
  - Always `ImageOps.exif_transpose`.
  - Convert HEIC with `pillow-heif`.
- **No real photo** (products, leaflets and business cards, workwear, set-up documents):
  - Build a clean 3D-style mock-up in HTML/CSS (gradients, soft shadows, the brand logo, generic labels with no invented claims or product facts).
  - Screenshot it with Playwright and bake it.
  - Prefer a real crop where one exists (e.g. an owner's polo with the logo).
  - **You can't generate photographs.** Say so, and offer to drop in AI or real images Adam supplies.

---

## 5. The no-transparency rule (bake everything)

The PDF must contain **no transparency**: no CSS masks, opacity or rgba fills over images.

- Bake every fade, gradient, round avatar and logo-on-photo into a JPEG with PIL/numpy at 8 px/mm.
- Helpers in the toolkit:
  - `bake_or.py`: `hero`, `crop_focal`, `fill`, `logo`, `circle`
  - `bake_r2.py`: `hero_A`, `inpaint_rect`
  - `bake_r7.py`: `avatar`
- Check every render:
  - `raw.count(b'/SMask') == 0`
  - `raw.count(b' W n') == 0`

---

## 6. Red notes (open questions)

- Every [CONFIRM]/[MISSING] becomes a red note at the spot it applies to:
  - plain Roboto at about 10.5pt, colour #d32f2f
  - **not handwritten**
- Wording is casual, in Adam's voice: "70% or 85%?", "need full monthly costs from Emily", "£2k deposit?".
- At hand-over, list every note as a numbered question, grouped by topic and with PDF page numbers, plus the booking link, phone and video links. Adam sends that list to the client.

---

## 7. Special pages

**Owners map** (`bake_map*.py`):
- UK outline and pins traced from the brand's locations map. `map.json` holds the paths and pins; `mapM.json` converts longitude/latitude to map position.
- Crop the top so all of mainland Scotland shows (no flat cut-off). Islands are left out.
- Light-blue sea panel running from the top of the panel down. Green pins with a white logo.
- Owner avatars around the coast, with dashed lines to their pin.
- Avatars and name labels must not overlap each other or the text. Rebuild label positions from the layout file each round.
- Owner cards in a panel on the right.

**Territory map:**
- The same map with pins only, whole country.
- Faded in from the left so the text over it reads.
- No availability list.

**Ads proof:**
- Crop the Ads Manager screenshots to the owner lead campaign rows.
- Blur campaign names and the account ID.
- Circle the best results in red rounded rectangles.
- Stat boxes: total enquiries, cost per enquiry, times seen. Never total spend.
- Give the screenshot an explicit height so nothing shrinks.

**Ad budget projections:**
- Three budget columns in different colours, bold numbers.
- Enquiries → jobs → money back → £ back per £1.
- Labelled projected.

---

## 8. Build and render

- **One round = one build script + one bake script:**
  - `build_rN.py` imports the previous round's page dict `P`, applies only this round's fixes and writes `build/prospectus-rN.html`.
  - `bake_rN.py` writes that round's images to `build/img/`.
- **Every round:**
  - Renumber the tabs from `ORDER`.
  - Rebuild the contents from `ORDER`/`TITLES`.
  - Apply the red-note styling.
  - Swap in the current phone number.
  - Add the end-band script and the gap-spreading script, which skips banded pages.
  - Add the fit script.
- **Render:**
  - `NODE_PATH=$(npm root -g) node render_rN.js`
  - Playwright Chromium `page.pdf` with `preferCSSPageSize`, `printBackground`, `tagged`, `outline`, after `document.fonts.ready`.

---

## Version names (from Oven Rescue, Nov 2026)

- **Drafts:** `<Brand> - Prospectus V0.01`, `V0.02`, … (one number per proof round, plus a matching `REVIEW` copy and `source.zip`).
- **Signed off:** the first approved version is `<Brand> - Prospectus V1.0`. Every later update goes up by 0.1 (`V1.1` … `V1.9`), then `V2.0`, `V2.1` and so on.
- The same rule applies to the Next Steps PDF (`<Brand> - Next Steps V1.0`) and the source zips (`… V1.0 source.zip`).
- Never overwrite a signed-off version: save the change as the next number, and remind Adam to re-upload it to GHL (Media Storage > Assets > Prospectus / Next Steps) and update the link in the Content Manager's General tab > Documents if the file URL changes.
- Oven Rescue: V1.0 = round 21 (Mike Kempe cover), 37 pages.

## Next Steps PDF

- Every brand also gets a 9-page Next Steps PDF built the same way (`build_nextsteps.py`): cover (locked cover design, different owner from the prospectus), thank you letter, checklist, preparing for your call, on your call, before you decide, meet your team, launching your territory (timeline with solid green label blocks on the left, horizontal text), we'd rather be honest. Text also lives in a Google Doc.
- Links go to the client's franOS pages, never straight to files or docs: `https://crm.<domain>/prospectus` and `/questions` with `utm_source=next-steps&utm_medium=pdf&utm_campaign=<brand>-next-steps&utm_content=<page>`.

### Standard link map (same for every brand; templated)

| In the PDF | Goes to |
| --- | --- |
| Prospectus: every Schedule a Call with [contact] button and end band | `https://crm.<domain>/call` + prospectus UTM, `utm_content=<page-slug>` |
| Prospectus: full case-study Watch buttons, photo half, bottom bar | `https://crm.<domain>/video/vtN-short` (VT1, VT2, VT3 in CRM order) + prospectus UTM |
| Prospectus: contents lines | internal `#id` |
| Next Steps: Download Prospectus, "Read through the prospectus" checklist line | `https://crm.<domain>/prospectus` + next-steps UTM, `utm_content=prospectus` |
| Next Steps: Read Prepared Questions (every one), "Look through the prepared questions" checklist line | `https://crm.<domain>/questions` + next-steps UTM, `utm_content=questions` |
| Both: phone, email | `tel:` / `mailto:` |
| Next Steps Google Doc | the same /prospectus and /questions URLs |

Never link a Google Doc, a GHL file URL or a YouTube link directly. Before delivering either PDF, list its link annotations with pypdf and check every one against this table. Deliver only the versioned file (`<Brand> - Next Steps V1.0.pdf`) and tell Adam to delete older unversioned drafts (Oven Rescue: the old "Next Steps (9 pages).pdf" still linked straight to the questions Google Doc).

## 9. Checks before every round goes out

1. `shrunk.js`: must print "none shrunk".
2. `spacing.js`: overlaps, tight gaps, margin overflow. Planned overlaps (labels on photos, package images bleeding to the edge) are fine; fix the rest.
3. Transparency check (section 5): both counts 0. Page count as expected.
4. **Look at every changed page** as an image (`pdftoppm`, about 60dpi for the page, zoomed crops for detail). Check:
   - faces, crops and fades
   - labels over photos
   - one CTA per page
   - font sizes matching the pages around it
   - map labels clear
5. **Deliver:**
   - **Every round ships two PDFs:** the clean copy and a **review copy** (`REVIEW=1 python3 build_rN.py`, `render_rN_review.js`). In the review copy, every changed text run is highlighted solid yellow (`mark.chg`, via the `hlw()` wrapper inside `rep()`), and anything Adam must check (red notes, my estimates, new charts, judgement calls) gets a see-through yellow box with a gold outline. Removed text can't be highlighted, so list removals in the summary.
   - `SendUserFile` the PDF and commit the clean PDF, review PDF, source zip and updated toolkit to `websites/<Brand>/Claude-Designer/` with `device_commit_files`.
   - A short summary of the changes by PDF page number.
   - What couldn't be done and why.
   - The open red notes.

---

## 10. Adam's standing design decisions

- Case studies:
  - Lead with the number, on one line.
  - Full page only with a video.
  - Thin owners go on 2-up or 4-up pages.
  - One case-study page every 3–4 pages.
- Photos:
  - Eyeline on the top third.
  - No white space above photos.
  - Fades to the edges.
  - Zoom in to cut sky.
- Calls to action:
  - One CTA per page.
  - Spare space gets the big green band.
  - Padding above the copyright.
- Type: consistent fonts throughout. Compare against LH for size and spacing.
- Package:
  - The LH template over 3 pages.
  - A line above each item.
  - A real or mock-up image for every item.
- Owners map: avatars don't overlap, labels sit clear of photos and text, nothing cut off at the top.
- Contents fully linked. Phone clickable. Every link follows the standard link map (Next Steps PDF section): /call, /video/vtN-short, /prospectus, /questions on the client's franOS domain.
- Red notes in Adam's voice, never handwritten.
- No "available now" territory list.
- "Business Set-Up" means company formation.
- Keep the original layout when Adam only asks for a photo to be re-centred or re-cropped.
- **When Adam sends a reference image, reproduce it exactly.** Don't reinterpret the crop, fades or blur. For a cover: SIFT-match the reference to the full-res source to recover the exact placement, recover the fades as an alpha map (`ref = a*photo + (1-a)*white`), smooth and upscale it, apply it to the full-res photo (`bake_r20b.py`). Photos with transparent margins: flatten onto white first, because `load()` crops RGBA.
- Headline and subtitle line breaks exactly where Adam says. Subtitles under H1s must not wrap into the content below: shorten them.
- One wording for the CTA everywhere: "Schedule a Call with [contact]". Never "discovery call".
- One figure per fact, used everywhere: e.g. launch ads "£1,000 of your fee covers your first two months", never a range. Year-one numbers are whole numbers taken from the franchisor's VSL.
- Charts: keep them plain. Bars, y-axis labels, light gridlines, value on each bar. No arrows, % callouts or side notes in the chart. Put supporting stats in boxes underneath. Label periods truthfully (don't call a fourth-year figure "Year 2"; say "2026, estimated").
- Package pages: light green panel background (`--panel`), item images positioned absolutely so they run flush from one divider line to the next, no gaps.
- How-do-I-start steps: white divider lines running the full page width, and one vertical line the full height of the box.
- Parent-brand page (e.g. Epic Brands): white page, parent logo baked on white above the H1, orange ticks, black text and quotes, black end band with "Ready to learn more?", the Schedule button and the call icon/text in the parent's orange.
- Owner photos: round, green ring on the row colour. No photo: a green initial circle until Adam sends one.

---

## 11. Page patterns added in the OR rounds 14–20

- **Letter (p3):** brand claim + franchisee count, "We've built a business that works for you" (territory, marketing, booking system, pricing, training, support, jobs booked before day one), then "Here are some recent wins:" with 2 recent wins + 1 long-term owner, then "Our job is to fill your diary…". Talk about the brand, not the parent company.
- **What Year Two Looks Like** (right after First Six Months): green subtitle "Continue cleaning ovens yourself, or scale up and hire an operative." Two cards: **Owner Operator** (reduce ad spend dramatically because ~70% rebook, "Work towards a projected £X profit from one van") and **Scale Up** (hire an operative, we write the advert, same training, up to N vans per territory, "Work towards £X with two vans"). Owner quotes underneath.
- **Marketing run, three pages:**
  1. *Proven: Real Results From Our Ads* — the Ads Manager screenshot, a clear average (total spend ÷ total enquiries, stated in a footnote), never total spend; a numbers chain (cost per enquiry → 1 in 3 book → ads cost per job → average job → £ back per £1); three short points (done for you vs agency cost, customers come back, spend less over time). Short footer, not the big band.
  2. *What Our Owners Spend on Ads, and What It Brings In* — table with round photos: owner, spend, what it brought in, from the interview. Then one long-running owner with a plain turnover bar chart and three stat boxes below.
  3. *After Two Months, You Choose Your Budget* — spend columns (projection uses a cost per enquiry higher than the real average, said so), plus "There's a limit to what one van can do" (jobs/day cap → most owners settle at a mid budget; more work = second van). Then What You'll Be Doing, then Repeat Customers.
- **Training Week page** (after the 4-up case studies): title "Your Oven Cleaning Training Week", green subtitle naming the trainer. One clear row per day (day tag, short title, one line), the total real jobs done, a 2×2 Q&A, and a real new owner's first-week takings strip with a total.
- **Business Set-Up & Accounting:** copy the Leather Hero page: Company Set-Up, Accounting & Bookkeeping, Tax & Compliance, Understanding Your Numbers, Your Systems, as divided rows.

## 12. Facts and names

- Every fact traces to the interview transcript, VSL or client documents. Re-check **who** said each figure before using it (a "booked 7 weeks ahead" line belonged to Simon, not Deniz).
- Use the client's franchisee list for spellings and territories (OR: Shawn not Sean, "Glasgow South"). Keep names consistent across the CRM, VSL captions and prospectus.
- Look up anything that changes (e.g. Start Up Loans rose to 7.5% fixed in April 2026) before removing a red note.
- Before a big round, send Adam a short numbered list of how you read his voice notes plus the genuine questions, then build once he confirms. Remove each red note as soon as he clears it.

## 13. Launch review pack (after the funnel is built)

When the ads, landing page, VSL, prospectus, emails and franOS are live, Adam walks the client through everything on a call, then sends them a review pack. Reference: Oven Rescue, 10 Nov 2026 ("Oven Rescue - Launch Review Pack.zip").

**The pack is a zip of numbered PDFs, which Adam downloads and uploads himself:**

| File | What it is |
|---|---|
| 01 [Brand] - Launch Review.pdf | The walkthrough deck (below) |
| 02a [Brand] - Email Chain (N emails).pdf | Screenshots only, one email per page |
| 02b [Brand] - Call to Action Emails (N).pdf | The CTA Chain: hasn't-read versions first, then has-read |
| 02c [Brand] - Call Booked Emails (N).pdf | The Call Chain: confirmation, reminders, then the 10-minute email |
| 03 [Brand] - Prospectus.pdf | The live prospectus file |
| 04 [Brand] - Next Steps.pdf | |
| 05 [Brand] - Prepared Questions.pdf | Exported from the Google Doc |
| 06 [Brand] - Pages and Links.pdf | Every live page, document and GHL view, with its link and what it does |

If a Drive folder Adam links isn't visible to the connector, it belongs to another account. Don't keep retrying: make the zip. Drive connector uploads cap at about 3 MB a file.

### The Launch Review deck

- **Format:** landscape 1920 × 1080 px pages, Inter, brand colour, white background.
- **Plain style:** no shadows, no rounded corners, no faded or dark backgrounds. Square images with a thin #d6d6d6 border.
- **Layout:** ticks on the left, images on the right, both centred vertically on every page.
- **Ticks:** a bold lead, a colon, then the rest ("**Every lead has a temperature**: cold, warming or hot...").
- **Clickable images:** every image links to the real page, with a square brand-colour "Click to view →" button on its bottom-right corner. GHL screenshots say "Open in GoHighLevel →" and the dashboard says "Open the dashboard →".
- **Contents pages:** linked contents with a back link in each footer (to Contents, or to the GHL contents page).

**Page order:**
1. Cover ("Prepared for [names] · [month]")
2. How it works contents
3. Meta ads (best owner big, two below)
4. Landing page (long full-page screenshot)
5. Thank-you page (VSL), long, linked to /video/uc1
6. Prospectus: one big cover page, 8 thumbnails 4×2 underneath, plus Next Steps and Prepared Questions ticks
7. Email chain: types and counts, and how the emails are made
8. GoHighLevel (franOS) contents: the philosophy line, then a 2-column list
9. It tracks everything (DATA AND QUALIFYING): annotated contact page with numbered keys
10. Real-time data (KPI DASHBOARD): long dashboard image
11. Everything is automated (AUTOMATIONS)
12. Smart emails (RIGHT MESSAGE, RIGHT STAGE): the CTA emails by stage
13. Easily keep track of potential franchisees (OPPORTUNITIES PIPELINE)
14. YouTube-style testimonials (VIDEO TESTIMONIALS): desktop long plus mobile
15. Clean book-a-call page (CALENDAR): the /call page and the booking-confirmed page side by side
16. Easy access documents (DOCUMENT PAGES): one big, two stacked
17. Organised and accessible leads (LEAD FILTERING)
18. A robust system (ONGOING DEVELOPMENT): vertical flow of the system on the right, plus a "What we can add" list (WhatsApp/SMS, more testimonials recorded ongoing, more pages and emails)

### Screenshots

- **Capture:** Playwright, desktop at 1280 wide @1.5x, iPhone 13 for mobile.
- **Block trackers** (facebook, fbcdn, google-analytics, googletagmanager, doubleclick, tiktok, clarity, msgsndr track). **Never load real thank-you pages unblocked, and never link the deck to them:** they fire Meta events. Link the VSL to /video/uc1 and TY2 to /call.
- **Booking widgets** only render inside the viewport. Set the viewport height to the full page height (e.g. 5400) and scroll, or the calendar comes out blank.
- **Crop long pages** above the footer (check the footer copyright isn't another client's).
- **Dashboard:** export the Google Sheet as PDF via Drive, render it at 200 dpi, then stitch and trim.
- **Compress** with JPEG q78 at 1600 px wide when a file must go through the Drive connector.

### Email screenshots (exactly what's live in GHL)

1. **Get the preview URLs.** In franOS Sync > franOS Inventory.gs, run `listEmailTemplatesOR`. It logs the name, id and previewUrl for the CTA and Call folders.
   - To include the Email Chain folder, temporarily add `EC_PARENT` to its folder array.
   - Pick the function from the dropdown via read_page refs, never dumpInventory or buildEmailChainAll.
   - Edit through the Monaco model, save, run, then restore the line exactly and save again.
2. **Download:** from `https://storage.googleapis.com/highlevel-backend.appspot.com/location/<locationId>/emails/<templateId>/index.html`. The firebasestorage URL fails through the proxy.
3. **Fill the merge fields:**
   - custom values from the franOS Inventory "Custom values" tab
   - `{{contact.first_name}}` → Sarah
   - a sample appointment
   - trigger links → #
   - `{{#compare}}` blocks: keep next_step = call (prospectus for EC-00), and keep the booked_from band
4. **Render:** screenshot at 660 wide @2x and trim the whitespace under plain emails. One PDF per chain, each page sized to its email (Chromium named @page sizes), with nothing added to the page.
5. **Subject lines:** for the CTA and Call emails these live in the workflow actions, which the API can't read. The Email Chain subjects and previews are in `EC_EMAILS`.

### Pages and Links

One table per group:
- website pages (check each returns 200)
- documents
- email sequences (counts)
- GHL views (contacts, smart list, opportunities, workflows folder) and the dashboard

Flag the thank-you pages as "review from the screenshot" because they fire Meta events.

### Covering email

Short, from Adam to the client team: thanks, what's in the pack in funnel order, that every image is clickable, and to send any changes before go-live. Attach the pack.
