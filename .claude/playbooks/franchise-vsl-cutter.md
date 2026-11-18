
# Franchise VSL cutter (v2)

Adam (Franchise Right) recruits franchisees for franchisors. This playbook turns a long franchisor interview (usually a 45–75 minute Zoom call) into a VSL for the **thank-you page after someone downloads the prospectus**, with franchisee testimonial clips cut in as proof. It's built from Charlie's Oven Rescue VSL and Nick's Local Treasures VSL. Its sibling is the `franchise-testimonial-cutter` playbook: same method, different job.

If the "Testimonial Cutter" project is attached, read `claude/vsl-cutting-process.md` for the worked examples: the running orders, Adam's notes, and what he changed in each edit (section 8 is Local Treasures).

## 1. What the VSL is for

- **Get them to read the prospectus, then book a discovery call already informed.** It educates and filters. It can be long (10–15 minutes) if every minute teaches or proves something.
- **The franchisor talks; testimonials back him up.** Talk about *them* (the viewer), not *him*. Prefer "you" lines over "we/I" lines.
- **Structure:** Hormozi-style hook and promise up front, then webinar-style explanation (like the Sky High webinar), ending with "if you're ready, book a call".
- **Throughline of the whole video:** we get it sorted for you, you do the work, you make money, and here's the proof.
- **Every brand has a narrative:** the one story the whole VSL tells. Ask Adam for it on a new brand. Every section comes back to it. Two so far:
  - **Done for you** (Oven Rescue, Leather Hero): they do it all for you. The marketing fills your diary and the support is heavy, so marketing and support get the most time and the most testimonial backups. It's the best narrative to have when the brand has good franchisees to prove it.
  - **Sole trader to six figures** (Local Treasures): start on the tools, grow into a management franchise, low cost. It's less about how great the marketing is, because the marketing isn't as defined; the franchisees' growth stories carry it.
- **The franchisor sets it up; the franchisee proves it.** Cut the franchisor down to the lines that add a name, a number or a step. In Adam's final LT edit, Nick went from 539s to 457s while Lou and Sander stayed the same or grew.

## 2. Workflow

**Inputs:**
- the franchisor's recording (the video plus its audio, e.g. the Zoom `.m4a`)
- the Premiere transcript `.txt` (chunk-level) or `.json` (word-level), if Adam has exported one
- the brand's prospectus (for the numbers and the narrative)
- Adam's **finished** testimonial edits for that brand: each one's `.edl` plus the Premiere `.txt` of the edited sequence (no txt? make one with `vsrt.py edltxt` from the EDL and the full-interview JSON)
- **the full testimonial interviews' Premiere JSON**, so you can lift raw lines the finished edits don't have (Adam asked for this on LT: "not enough of Nick saying something and then it being backed up")
- the Windows paths, fps and durations of every source video

If the session is linked to his computer, request his `<Brand>\VSL` and `<Brand>\Testimonials` folders. Stage the audio (not the video; files over ~350MB time out). Get fps and duration from a previous Claude XML for that video, or from the `.prproj` (gzipped XML; ticks are 254,016,000,000 a second, so `MediaFrameRate` ticks give fps and `Duration` ticks give seconds).

1. **Read the whole transcript** and list the gold: specific numbers with time frames, screen-share walk-throughs (spend, then enquiries, then jobs, then turnover), calendars, earnings expectations, the onboarding steps, training, support, funding, the call, and who it's for.
2. **Draft the script as text,** section by section (section 3), with source times `[mm:ss]` and `CLIP Name [m:ss]` lines from the testimonial edits. Mark gaps ("Charlie never says X") with options: on-screen text, a phone pickup, or ask in the next interview.
3. **Adam reviews the text.** He'll restructure. Iterate until he says build. He may ask for it as a downloadable `.txt`; save a copy to his VSL folder.
4. **Build the XML** with the toolkit (section 7): `asr` only if there's no Premiere JSON (with one, pass it as the words file and `-` as the wav), then the spec, then `build`, then `xml`. Save `<Brand>-<Name>-VSL-ClaudeCut-vN.xml` and `.txt` to his VSL folder. Check that the XML parses, the clips are contiguous, and no out-point is past the media end. Tell him the real length.
   - **Captions** (Adam wants them on every VSL): `vsrt.py tokens`, fix `draft.txt` by hand, then `vsrt.py srt`. Rules in section 7. Save the `.srt` next to the XML.
   - **Standalone pieces** on request (a re-cut teaser, a single drag-in clip like "Sander bought another territory"): give each its own small spec, XML and SRT.
5. **Adam edits in Premiere and sends the EDL.** Run `vcut.py edl` and report, from the data: his order against yours, what he dropped and added, edge stats, and the length.
6. **Improve.** Add a section to `claude/vsl-cutting-process.md` and propose an updated version of this playbook.

## 3. Running order

The order depends on the franchise.

**Fixed every time:** teaser first; thanks / read the prospectus early; the earnings promise early, with funding close behind (straight after it on LT); onboarding, training and support late; next step last.

**The middle is built around three things.** Work them out and agree them with Adam before drafting:
- **the narrative** (section 1)
- **the strongest proof:** the franchisor's screen shares (Charlie) or the franchisees' own stories (Lou, Sander)
- **what the buyer worries about most:** getting work, affording it, or growing it

The two finished orders below are worked examples, one per narrative. Don't copy one onto a new brand without checking those three.

### Sole trader to six figures (Adam's final Local Treasures VSL, 12:33)

1. **Teaser (~65s), testimonial-led.** Testimonial clip, then the franchisor backing it up or setting it up, with the franchisees doing most of the talking (LT: Sander 32s, Lou 19s, Nick 14s). Nick only adds a name or a number: "Dave… commercial customers… £1,200 a month", "Lou must generate about 300 invoices" then Lou on 300 invoices. **End on growth:** Nick "Sander recently purchased additional zones" then Sander "I started in July 2024. By December 2025 I bought the second area".
2. **Thanks, read the prospectus** (scripted opener).
3. **What it is: basics only.** Who, when, why: name, year started, origin story, how it works in a line, franchising. The narrative waits for item 6.
4. **Earnings promise** with its frame: year one £40k with 15 Treasures at about 25 hours a week; year five £110k with 100 Treasures; you morph into a manager. Cut the in-between years.
5. **Funding, straight after earnings.** They've just heard the number; next they wonder how to pay.
6. **The model (the narrative)**, chopped between franchisor and franchisees: start as the operator, grow into a management franchise, no staff to employ, run your own team, start in one service, the app, subcontracting, no salary, then a franchisee's big team.
7. **Franchisees one at a time, in the narrative's order**, each intro merged with their proof: **operator** (Dave), then **how it works** (the job panel: same-day jobs, invoices, reviews), then **hybrid** (Sander), then **manager** (Lou).
   - **Marketing told through a franchisee's story** works better than the franchisor explaining it. Sander's order: head office paid the ads for three months, then £120k, then 20–30 customers, then £500–600 a month, then the pre-launch setup. Then his jobs, revenue, £12k months, his goal.
8. **Demand**, 9. **Training**, 10. **Support**, 11. **Next step.**

### Done for you (Adam's Oven Rescue draft 1)

The proof is the franchisor's screen shares, and marketing and support carry the narrative.

- teaser
- earnings promise
- thanks / read the prospectus
- who, what, when, plus the promise
- **proof stack**
- funding
- marketing
- growth
- support
- **onboarding and training**
- next step

Adam later added: training typically goes after marketing, then growth and support.

**Final (13:49), the reference for this narrative:** teaser (60s), earnings promise (16s), thanks / read the prospectus (15s), who, what, when (68s), proof stack (2:44: Sean, Noah, Dennis, then Simon as the lifestyle case with Mike and Trevor backing him), funding (31s), marketing (1:47), what a van turns over (24s), growth (2:17), support (1:12), onboarding and training (1:22), next step (51s). Onboarding and training stayed just before the next step. Charlie carries 79% of the runtime and the testimonials 21% (Trevor 79s, David 49s, Mike 46s).

Prove it first, then explain how. The step-by-step of what happens after "yes" comes right before "book a call". The blocks below describe each section. Place block 4's proof stack straight after block 2, and block 5 (onboarding) straight before block 8.

0. **Teaser trailer (~50s).** Alternate franchisor one-liners and testimonial clips, all outcomes: "Sean, in training this week. First week: 11 jobs booked in" / Trevor "I've done £1,000 in one day" / "Dennis's six months of trading… £28,500" / Mike "£1,000, sometimes £1,500 a week" / "we might turn the ads off because we're overbooked" / David "dropped it to £5 a day so I'm not inundated" / "two vehicles… £110–120k a year". End on franchisor credit (Trevor "I'll champion Charlie and Mark"). It's a teaser, not a spend story, but one jaw-dropping spend line is fine (Dennis "£10 a day… £1.68 per inquiry, which is extremely cheap", straight into "we might turn the ads off because we're overbooked"); the detail comes later. Teaser lines get used again in full in their own section (Dennis's £28,500, Mike's £1,000–1,500 a week, David's £5 a day, two vehicles at £110–120k).
   - **Then the earnings promise:** "As a franchise owner you should expect to turn over £X–Y in your first year… profits £A–B."
1. **Thanks, read the prospectus.** "Thanks for the inquiry… prospectus in your inbox… please read it before you schedule a call… case studies, FAQs, what to expect… put together a list of your own questions to bring to the discovery call."
2. **Who, what, when, and the promise.** Name and role, started in year X, number of franchisees (**the brand's own figure**, not the holding company's), number of reviews. Then "all sorts of people, no experience needed, low barrier to entry, we give you the training", with the franchisees' "before" clips (redundancy, liquidation, DPD driver). Then the promise ("we can start things off really quickly… take it as far as you want… we can help you get there"). Add the agenda ("everything's in place: funding, marketing, training, support") as on-screen bullets if he doesn't say it.
3. **Funding.** You don't need the fee in the bank, the options available, part of the fee goes on your ads. Back it with a testimonial loan clip.
4. **Marketing.** Years and money of ad experience (use the biggest claim he makes, e.g. "millions"); "you inherit our mistakes"; "we're not testing with your cash"; launch timing means you're booked before training; "we'll run the ads for you"; demand outweighs supply; turn the ads off when overbooked. Put a testimonial backup after each claim.
   - **What a van or territory turns over**, backed by testimonial income clips. In the OR final it sits between marketing and growth: Charlie's £1,100–1,300 a week, Mike's £1,000–1,500 a week, then Trevor's £20-a-day maths (4–5 ovens a day at about £80 each, plus upselling).
   - **Proof stack (screen shares):** one franchisee at a time, newest to most established (day one, week one, year one, lifestyle).
     - **Lead with the result**, then the ad data. Dennis: £28.5k in six months, then £60–62k in year one, then Morrisons for 18 years, then £10 a day / £1.68 / £298 for 178 enquiries / booked seven weeks ahead.
     - **End a case on a line that hands it to the viewer:** "So to hit the ground running, as we're doing with Sean, is what we always try and achieve with everybody."
     - Lifestyle cases get testimonial backup (Mike "weekends for myself", Trevor "home for 2:00").
5. **Onboarding and training:** thumbs-up to training in N weeks, what's set up for you, the training week, your first day.
6. **Support:** daily contact, who helps with what, "we'll spot it before you do". Testimonial: "a phone call away". End on "never on your own".
7. **Growth:** year one, then customers come back, then the options after year one, then a second-van case (with the testimonial "nervous… let's go for it… gone to plan"), then the multi-van numbers, then "we'll advise you how to grow", then the network.
8. **Next step:** what the call covers, transparency, right fit both ways, speak to our franchisees (testimonial "call me, come out with me"), "bring your questions… chat soon". Put a "book a call below" button on screen.

## 4. Keep and cut

**Keep:**
- specific numbers with time frames
- screen-share walk-throughs
- "you" lines
- testimonial lines that say the same thing as the franchisor (put them straight after his line)
- doubt-then-payoff stories
- honest, credible lines ("7 or 8 out of 10 times… fully booked")

**Cut:**
- the interviewer
- lines that say nothing ("works beautifully", "quite a few success stories")
- negative framing ("turnover isn't huge")
- agency-cost comparisons
- the acquisition or holding-company story
- other brands
- tangents and pre-call chat
- duplicated lists (review platforms)

**Always name the franchisee.** "Dave runs our Basingstoke area", never "we have a gentleman". The franchisor usually says the names somewhere; isolate the name and cut it in front of the line. Check how the transcript spells it (Premiere wrote Sander as "Sandra").

**Don't echo.** A franchisor line next to a testimonial must add something the clip doesn't. Adam cut Nick's "Sander did really well with that job" everywhere, because Sander's own clip says it.

**Cut cost and kit lines** (low cost, vans, entry price) when the model already shows it's low cost. Cut "website that provides…" style descriptions from "What it is".

**Raw testimonial lines** (from the full interview, not the finished edit) are fine for backups and franchisee sections. Keep each one longer than about 3 seconds and make it a complete thought.

**Cut redundant words (Adam's biggest edit).** Ask of every phrase: is this redundant? Does the sentence still work without it, and is it clearer? Examples:
- "what really makes us different is the fact that we can start things off really quickly" became "we can start things off really quickly"
- "Sean, who's in training" became "Sean, in training"
- "what we're looking at is Dennis's campaign" became "Dennis's campaign"
- "you'll be joining Mike, and you'll know" became "you'll know"
- "something extra, something for themselves" became "something for themselves"
- "five out of five ratings on Google, Checkatrade and other platforms" became "five out of five ratings"
- "confident and comfortable with how the process works" became "confident and comfortable"

Also drop lead-ins ("Since", "Normally", "immediately", "about", "So") when the sentence stands without them. Split the clip around the dropped words.

**Concrete lists stay:** the onboarding setup list ("the calendar system, your CRM, business pages and accounts, your Google Business, your Meta Business") was added back in.

**Context:** a bare number needs its frame. "£1.68 per inquiry" became "our daily budget is £10 a day and our cost per result… is £1.68 per inquiry".

**Splicing:** much lighter than in testimonials. Keep the franchisor's sentences whole, and trim with start and end phrases. Word-level Frankenstein splicing is for the teaser only (e.g. reorder "first week" and "11 jobs booked in").

## 5. Interview questions (if Adam asks what to ask a franchisor)

Use open-ended questions, in VSL order. Tell them to put the question in the answer, and to have screen shares ready: the ads manager, the CRM or calendar, and dashboards.

- Thanks for downloading the prospectus: what's in it, and why read it first?
- Who are you? When did it start? How many franchisees, how many reviews, and how are owners doing on average?
- What is the business, in one or two sentences?
- What should someone expect to turn over and take home in year one? And by year three?
- What do you promise, and what's in place from day one? What makes you different?
- What's going on in people's lives when they get in touch? What worried them, and how did it turn out?
- How does the model work, and how does the money flow? How do you grow from doing the work into managing it?
- Who joins? Do you need experience? **Who isn't it right for?**
- What does it cost, and what's included? **What funding is there: who lends, how much, how fast, and how many franchisees used it?** What are the monthly fees?
- Where do customers come from? Show one franchisee: spend, then enquiries, then jobs, then revenue. How fast do the first leads come in?
- Results for 2–4 franchisees, with their calendars. What does someone earn on day one, in week one, in month one? Tell me about a worry or slow start and how it worked out.
- Onboarding, step by step, and how long it takes. What does training cover?
- The support team, and who does what. A time you helped someone through a problem.
- What could the business be worth in 3–5 years? The territory. How the network helps.
- What happens on the call? Can people speak to franchisees? How long do people take to decide?
- What would you say to someone on the fence? What should they do next?

**Scripted lines to record if the interview doesn't cover them:**
- **Opener:** "Thanks for your interest… your prospectus is in your inbox… please read it before you book a call. It's got everything you need to make a decision: case studies, earnings, funding, marketing, training and support… write down your questions, then book a call."
- **Close:** "Thanks for watching… book a call using the button below… on the call I'll answer your questions, find out about you, check your area, go through funding, show real figures, and you can speak to our owners… no pressure… bring your questions."

## 6. What Adam changed (apply these by default)

**Local Treasures final (13:44 to 12:33):**
- funding moved up to straight after earnings
- the job-panel explainer moved to after Dave, before Sander
- Sander's marketing lines reordered into a story (three months paid, £120k, 20–30 customers, £500–600 a month, pre-launch)
- teaser: dropped Nick's echo lines, added Lou's £26–28k and Sander's humongous team, ended on the second territory
- dropped: "website that provides… Hampshire, Surrey", low cost / vans / entry price, the year-two hours lines, "we would expect you probably to be the operator of that"
- edges: built from Premiere JSON word times, his in- and out-points matched at a median 0ms; he still split 15 clips

**Oven Rescue v1:**

- The earnings promise moved from the Who section to straight after the teaser.
- The teaser opens on the strongest testimonial line (Trevor "booked up a month in advance").
- The cost-per-lead line got its context.
- The prospectus line ends on "put together a list of your own questions to bring to the discovery call".
- Dropped: "quite a few success stories", "turnover isn't huge… by choice", and the list of review platforms.
- **Length:** 14:55 to 13:59, mostly from edge trimming and removing ums inside clips.
- **Draft 1 (13:54):**
  - the proof stack moved up to straight after the promise, and onboarding moved to just before the next step
  - Dennis now leads with his result
  - Sean ends on the hand-over line
  - funding leads into marketing ("a proportion of your fee, we run campaigns on your behalf, as we've got millions of pounds of experience")
  - Trevor's full support run stays ("a phone call away… can't sing their praises enough")
  - dropped: "next week is fully booked already", "7 or 8 out of 10 times"
  - redundant words cut throughout
  - in-points still a median 80ms later than Claude's
- **Final (13:54 to 13:49):** a polish pass with the order unchanged from draft 1. The next step ends on Trevor "call me… you'll be surprised what you can do", then Charlie "bring your questions… chat soon".

## 7. Technical method

Save the toolkit below as `vcut.py`. It needs numpy, ffmpeg and `faster-whisper` (`pip install --break-system-packages faster-whisper`; the small.en model downloads from Hugging Face, which works through the proxy).

```bash
python3 vcut.py asr "audio1999875092.m4a" words.json          # ONLY without a Premiere JSON. ~25 min for 73 min of audio on 2 CPUs; run it in the background
python3 vcut.py build spec.py "2026-11-05 14-06-34.json" - clips.json   # with a Premiere JSON: '-' = trust its word times, no audio needed
python3 vcut.py tlines spec.py Trevor                         # list a testimonial edit's lines with cut-sequence times
python3 vcut.py build spec.py words.json audio1999875092.wav clips.json
python3 vcut.py xml spec.py clips.json "/mnt/user-data/outputs/OvenRescue-Charlie-VSL-ClaudeCut-v1" --name "Oven Rescue VSL - Charlie - Claude cut v1"
python3 vcut.py edl spec.py words.json clips.json "Adam's edit.edl"   # compare his edit with yours
python3 vsrt.py tokens spec.py clips.json capsdir --words words.json   # captions: then fix capsdir/draft.txt into fixed.txt
python3 vsrt.py srt capsdir fixed.txt "/mnt/user-data/outputs/<name>.srt"
python3 vsrt.py edltxt "Lou - adam edit.edl" 30 "Lou - full.json" Lou-final.txt   # Premiere-style txt of a finished edit
```

**spec.py** describes the sources and the cut:

```python
MAIN = dict(name='Charlie', path=r"C:\Users\Adam Smith\...\VSL\Zoom Call Charlie\video1999875092.mp4",
            fps=25, dur=110235, w=1970, h=1108, sr=48000, ch=2)
SEQ_FPS = 25
TESTIMONIALS = {   # Adam's FINISHED edits: EDL + Premiere txt of that sequence (staged copies), plus the source video
  'Trevor': dict(edl="/mnt/user-data/uploads/Testimonials/Trevor Holmes/Trevor - Claude cut v1 - adam edit.edl",
                 txt="/mnt/user-data/uploads/Testimonials/Trevor Holmes/Trevor - Claude cut v1 - adam edit.txt",
                 path=r"C:\Users\Adam Smith\...\Testimonials\Trevor Holmes\video-trevor-holmes.mp4",
                 fps=30, dur=106980, w=1280, h=720, sr=16000, ch=1),
  'Lou':    dict(edl=..., txt=..., path=...,
                 words="/mnt/user-data/uploads/Interviews/Lou/Lou - Local Treasures.json",   # full-interview Premiere JSON: enables 'S' raw clips
                 fps=30, dur=103518, w=1920, h=1080, sr=48000, ch=2),
}
L  = lambda a, b: ('T', 'Lou', a, b)                  # from Adam's finished Lou edit (record times)
RL = lambda t, a, b=None: ('S', 'Lou', t, a, b)       # raw Lou interview: chunk mm:ss, start phrase, end phrase
N  = lambda t, a, b=None: ('C', t, a, b)              # main speaker
DROP = ('your Google ranking to ensure',)        # main-speaker clips to remove, by first words
S = [  # (section, Premiere label colour, items)
 ("0 Teaser", "Mango", [
   ('C', '43:56', "sean who's in training this week", None),   # main speaker: chunk start mm:ss, start phrase, end phrase|None
   ('T', 'Trevor', '00:00:00:00', '00:00:01:23'),              # testimonial: name, in and out on HIS edited sequence (from tlines)
   RL('30:00', "this year it's going to be 50,000"),             # raw interview line (needs words= on that testimonial)
   N('26:00', "dave"), N('26:26', "only started in february 2026"),   # isolate a name, then the line
 ]),
]
```

- **Phrases** are matched against the transcript words (punctuation and £ ignored, so "50,000" matches "50,000 pounds"). With Premiere JSON, numbers come as digits and names can be wrong ("Sandra" for Sander). With Whisper, numbers often come out as words ("one pound sixty eight", "twenty eight thousand five hundred", "two o 'clock") and names get misspelled ("Shawn"). `build` prints the nearby words for every miss; fix the phrase and rerun. Use apostrophes as Whisper writes them ("network's").
- **Testimonial clips are picked by record time on Adam's finished edit.** `build` takes the EDL events that overlap that range by more than half, so his splices and trims come across exactly.
- Label colours: Violet, Iris, Caribbean, Lavender, Cerulean, Forest, Rose, Mango, Purple, Blue, Teal, Magenta, Tan, Green, Brown, Yellow. Use one per section.

**Gotchas:**
- **Mixed frame rates:** clip in/out points are written at the sequence rate (e.g. a 30fps testimonial in a 25fps sequence uses source seconds × 25), with the clipitem `<rate>` equal to the sequence rate. This imported correctly.
- **Keyed or masked clips** in Adam's EDLs show as a `K B` line (the real clip) plus a `K 000` line (the mask). Parse `C|K B`. A `K B` line's record time can be wrong: in the OR final, four Trevor events were listed at 16:26, past the 13:49 end, but they belong in the gap at 13:42. Event numbers stay in timeline order, so place events by event number when record times run past the sequence end.
- In a multi-source EDL, take audio events only (`AA` or `AA/V`). `V`-only events are b-roll or graphics.
- **Premiere txt line times don't match EDL events exactly,** so select events by overlap, not containment.
- **Whisper drops fillers,** so split at gaps over 0.25s. Adam still removes more ums by hand.
- **Edges:** with a Premiere JSON, use wav `-`: word times plus a 20ms lead and 100ms tail matched Adam at a median 0ms (LT). With Whisper, onset comes from RMS and offset at half the threshold; Adam's in-points were about 30–70ms later.
- **Fillers:** Premiere tags them (`disfluency`); `build` blanks them and splits the clip around them, as well as at pauses over 0.25s. Raw testimonial clips ('S') always use word times.
- **Premiere splits big numbers** ("200" "000"); the loader joins them.
- **Device bridge:** stage the audio, JSON and EDLs, not the videos (the 400MB limit). Copy outputs into `/mnt/user-data/outputs` before committing them to his folder.
- **Don't trust the script's length estimate.** Whole sentences run about 40% longer than the elided script. Report the real build length.

**Captions (`vsrt.py`):**
- `tokens` maps every kept word to sequence time and groups them into lines (a new line at each source jump or section) in `draft.txt`.
- Fix `draft.txt` by hand, one line per line (never add or drop a line):
  - £ and digits: "£40,000", "£5.20", "£1,200 a month", "£100,000 to £108,000" (not "100 to 108,000"); commas from 1,000 up
  - full stops and capitals where the sentences end
  - names spelled right; best-guess mis-hears, listed for Adam to check
  - lines with no subject get one ("She's aiming…")
- `srt` aligns the fixed text to the word times (difflib) and writes one-line captions up to 42 characters, balanced, breaking at commas and sentence ends; min 0.7s, 0.25s hold, no overlaps, the last clamped to the sequence end.

```python
#!/usr/bin/env python3
"""VSL cutter toolkit: one main speaker (franchisor) + clips lifted from finished testimonial edits.
  asr    audio.(m4a|mp3|wav) words.json            word-level transcript (faster-whisper small.en) + audio.wav
         (skip asr if Adam exported a Premiere transcript JSON: pass that as words.json and '-' as the wav)
  tlines spec.py NAME                              list a testimonial edit's lines with cut-sequence times
  build  spec.py words.json audio.wav clips.json   phrase spec -> clips (prints misses with nearby words)
  xml    spec.py clips.json OUT_BASE --name NAME    multi-source FCP7 xmeml for Premiere + script .txt
  edl    spec.py words.json clips.json ADAM.edl     decode Adam's edit, compare with clips.json
"""
import json, re, sys, argparse, subprocess, wave
import numpy as np

def load_spec(p):
    ns = {}; exec(open(p).read(), ns); return ns
def tc(s, fps):
    h, m, x, f = map(int, re.split(r"[:;]", s)); return h*3600 + m*60 + x + f/fps
def secs(s):
    p = list(map(int, s.split(':'))); return p[0]*60 + p[1] if len(p) == 2 else p[0]*3600 + p[1]*60 + p[2]
def norm(s): return re.sub(r"[^a-z0-9']", "", s.lower().replace('£', ''))
FILL = {'um', 'uh', 'erm', 'er', 'ah', 'mm', 'hmm'}
def load_words(path):                      # whisper words.json (list) or Premiere transcript JSON (fillers blanked)
    d = json.load(open(path))
    if isinstance(d, list): return d
    out = []
    for seg in d['segments']:
        for w in seg['words']:
            t = w['text'] if w.get('type', 'word') == 'word' else ''
            if 'disfluency' in (w.get('tags') or []): t = ''
            if out and re.match(r"\d{3}\b", t) and re.search(r"\d$", out[-1]['w']):   # Premiere splits "200 000"
                out[-1]['w'] += t; out[-1]['e'] = w['start'] + w['duration']; continue
            out.append(dict(s=w['start'], e=w['start'] + w['duration'], w=' ' + t))
    return out

# ---------- asr ----------
def cmd_asr(a):
    from faster_whisper import WhisperModel
    wav = re.sub(r"\.\w+$", "", a.audio) + ".wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", a.audio, "-ac", "1", "-ar", "16000", wav], check=True)
    wf = wave.open(wav); A = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    m = WhisperModel('small.en', device='cpu', compute_type='int8')
    segs, _ = m.transcribe(A, word_timestamps=True, vad_filter=True, beam_size=1)
    W = []
    for s in segs:
        W += [dict(s=w.start, e=w.end, w=w.word) for w in s.words]; print(round(s.end), flush=True)
    json.dump(W, open(a.out, 'w')); print('DONE', len(W), 'words; wav at', wav)

# ---------- testimonial edits (EDL + Premiere txt of the finished cut) ----------
def edl_events(path, fps):
    ev, seen = [], set()
    for l in open(path, errors='ignore'):
        m = re.match(r"\s*(\d{3,6})\s+\S+\s+(\S+)\s+(?:C|K B)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)", l)  # 'K B' = keyed/masked clip
        if not m or m[5] in seen: continue
        seen.add(m[5]); ev.append(dict(si=tc(m[3], fps), so=tc(m[4], fps), ri=tc(m[5], fps), ro=tc(m[6], fps)))
    return ev
def txt_lines(path, fps):
    out = []
    for b in open(path).read().strip().split('\n\n'):
        p = b.split('\n'); x, y = p[0].split(' - '); out.append((tc(x, fps), tc(y, fps), p[2] if len(p) > 2 else ''))
    return out
def grab(T, r0, r1):
    a, b = tc(r0, T['fps']), tc(r1, T['fps'])
    sel = [e for e in edl_events(T['edl'], T['fps']) if min(e['ro'], b) - max(e['ri'], a) > 0.5*(e['ro'] - e['ri'])]
    words = ' '.join(t for s, e, t in txt_lines(T['txt'], T['fps']) if min(e, b) - max(s, a) > 0.5*(e - s))
    return sel, words
def cmd_tlines(a):
    T = load_spec(a.spec)['TESTIMONIALS'][a.name]; f = T['fps']
    for s, e, t in txt_lines(T['txt'], f):
        fmt = lambda x: f"00:{int(x//60):02d}:{int(x%60):02d}:{int(round((x%1)*f)):02d}"
        print(f"{fmt(s)} - {fmt(e)}  {t}")

# ---------- build ----------
def cmd_build(a):
    sp = load_spec(a.spec); S, TS = sp['S'], sp['TESTIMONIALS']; main = sp['MAIN']['name']
    W0 = load_words(a.words)
    SRCW = {main: W0, **{n: load_words(v['words']) for n, v in TS.items() if v.get('words')}}
    W = W0; T = [norm(w['w']) for w in W]
    def use(src):
        nonlocal W, T
        W = SRCW[src]; T = [norm(w['w']) for w in W]
    def match(seq, i):
        j = i; k = 0
        while k < len(seq) and j < len(T):
            if T[j] == seq[k]: j += 1; k += 1
            elif T[j] == '' or T[j] in FILL: j += 1
            else: return None
        return j - 1 if k == len(seq) else None
    def find(p, t0):
        seq = [norm(x) for x in p.split() if norm(x)]
        for i in range(len(T)):
            if t0 - 8 <= W[i]['s'] <= t0 + 45 and T[i] == seq[0]:
                e = match(seq, i)
                if e is not None: return i, e
    def find_after(p, i0):
        seq = [norm(x) for x in p.split() if norm(x)]
        for i in range(i0, len(T)):
            if W[i]['s'] > W[i0]['s'] + 75: return None
            if T[i] == seq[0]:
                e = match(seq, i)
                if e is not None: return e
    near = lambda x, y: ' '.join(f"[{W[i]['s']:.0f}]"*(i % 12 == 0) + W[i]['w'].strip() for i in range(len(W)) if x <= W[i]['s'] <= y)
    if a.wav == '-':                               # no audio: trust the (Premiere) word times
        onset = offset = lambda t0, t1: None
    else:
        wf = wave.open(a.wav); sr = wf.getframerate()
        A = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        h = sr // 100; E = np.sqrt((A[:len(A)//h*h].reshape(-1, h)**2).mean(1)); thr = 0.12*np.median(E[E > np.percentile(E, 60)])
        def onset(t0, t1):
            i0 = int(max(0, t0)*100); ix = np.where(E[i0:int(t1*100)] > thr)[0]; return (i0 + ix[0])/100 if len(ix) else None
        def offset(t0, t1):
            i0 = int(t0*100); ix = np.where(E[i0:int(t1*100)] > 0.5*thr)[0]; return (i0 + ix[-1] + 1)/100 if len(ix) else None
    C = []; bad = 0
    for sec, col, items in S:
        for it in items:
            if it[0] == 'T':                       # ('T', name, rec_in, rec_out) from the finished testimonial edit
                _, n, r0, r1 = it; sel, words = grab(TS[n], r0, r1)
                if not sel: print(f"!! NO EVENTS {n} {r0}-{r1}"); bad += 1; continue
                for e in sel: C.append(dict(sec=sec, col=col, src=n, i=e['si'], o=e['so'], text=''))
                C[-1]['text'] = words; continue
            if it[0] == 'S':                       # ('S', name, 'mm:ss', start, end): raw testimonial interview
                _, src, ts, p0, p1 = it
            else:
                src = main; _, ts, p0, p1 = it
            if W is not SRCW[src]: use(src)
            t0 = secs(ts); r = find(p0, t0)
            if not r: print(f"!! START '{p0}' near {ts}:\n   {near(t0-5, t0+40)}\n"); bad += 1; continue
            i, j = r
            if p1:
                j = find_after(p1, i)
                if j is None: print(f"!! END '{p1}' after '{p0}' {ts}:\n   {near(W[i]['s'], W[i]['s']+40)}\n"); bad += 1; continue
            groups = [[i]]
            for k in range(i + 1, j + 1):          # split at fillers (Premiere tags them) and pauses (whisper drops ums)
                if not W[k]['w'].strip() or T[k] in FILL:
                    if groups[-1]: groups.append([])
                    continue
                if groups[-1] and W[k]['s'] - W[groups[-1][-1]]['e'] > a.pause: groups.append([])
                groups[-1].append(k)
            groups = [g for g in groups if g]
            for g in groups:
                k0, k1 = g[0], g[-1]
                pe = W[k0-1]['e'] if k0 > 0 else 0; ns = W[k1+1]['s'] if k1 + 1 < len(W) else W[k1]['e'] + 1
                if a.wav == '-': pe = min(pe, W[k0]['s'] - a.lead); ns = max(ns, W[k1]['e'] + a.trail)
                on = onset(max(pe, W[k0]['s'] - .25), W[k0]['s'] + .2) or W[k0]['s']
                of = offset(W[k1]['e'] - .15, min(ns, W[k1]['e'] + .35)) or W[k1]['e']
                if src != main or a.wav == '-': on = of = None
                on = on or W[k0]['s']; of = of or W[k1]['e']
                if src != main: pe = min(pe, W[k0]['s'] - a.lead); ns = max(ns, W[k1]['e'] + a.trail)
                C.append(dict(sec=sec, col=col, src=src, i=max(on - a.lead, pe - .02), o=min(of + a.trail, ns + .02),
                              text=' '.join(W[k]['w'].strip() for k in g)))
    drop = tuple(sp.get('DROP', ()))
    C = [c for c in C if c['o'] - c['i'] > 0.1 and not (drop and c['src'] == main and c['text'].startswith(drop))]
    json.dump(C, open(a.out, 'w')); print('BAD', bad, '|', len(C), 'clips', f"{sum(c['o']-c['i'] for c in C)/60:.2f} min")

# ---------- xml ----------
def cmd_xml(a):
    from xml.sax.saxutils import escape
    from urllib.parse import quote
    sp = load_spec(a.spec); FPS = sp.get('SEQ_FPS', 25)
    FILES = {sp['MAIN']['name']: sp['MAIN'], **sp['TESTIMONIALS']}; IDS = {n: f"file-{k+1}" for k, n in enumerate(FILES)}
    rate = lambda f: f"<rate><timebase>{f}</timebase><ntsc>FALSE</ntsc></rate>"
    def filedef(n):
        f = FILES[n]; url = "file://localhost/" + quote(f['path'].replace('\\', '/'), safe='/:'); nm = re.split(r"[\\/]", f['path'])[-1]
        sc = f"<samplecharacteristics>{rate(f['fps'])}<width>{f['w']}</width><height>{f['h']}</height><anamorphic>FALSE</anamorphic><pixelaspectratio>square</pixelaspectratio><fielddominance>none</fielddominance></samplecharacteristics>"
        return (f'<file id="{IDS[n]}"><name>{escape(nm)}</name><pathurl>{url}</pathurl>{rate(f["fps"])}<duration>{f["dur"]}</duration>'
                f'<timecode>{rate(f["fps"])}<string>00:00:00:00</string><frame>0</frame><displayformat>NDF</displayformat></timecode>'
                f'<media><video>{sc}</video><audio><samplecharacteristics><depth>16</depth><samplerate>{f["sr"]}</samplerate></samplecharacteristics><channelcount>{f["ch"]}</channelcount></audio></media></file>')
    tcs = lambda fr: f"{fr//(3600*FPS):02d}:{fr//(60*FPS)%60:02d}:{fr//FPS%60:02d}:{fr%FPS:02d}"
    C = json.load(open(a.clips)); V, Au, M, txt = [], [], [], [a.name, ""]; t = 0; sec = None; done = set(); n = 0
    for c in C:
        fi, fo = round(c['i']*FPS), round(c['o']*FPS); d = fo - fi
        if d <= 0: continue
        n += 1; src = c['src']; sdur = round(FILES[src]['dur']/FILES[src]['fps']*FPS)   # in/out written at sequence rate
        if c['sec'] != sec:
            sec = c['sec']; M.append(f"<marker><comment>{c['col']}</comment><name>{escape(sec)}</name><in>{t}</in><out>-1</out></marker>")
            txt.append(f"\n## {sec} [{c['col']}]")
        txt.append(f"{n:3d}  cut {tcs(t)}  {src:8s} src {c['i']:8.2f}-{c['o']:8.2f}s  {c['text']}")
        v, au = f"v{n}", f"a{n}"
        links = (f"<link><linkclipref>{v}</linkclipref><mediatype>video</mediatype><trackindex>1</trackindex><clipindex>{n}</clipindex></link>"
                 f"<link><linkclipref>{au}</linkclipref><mediatype>audio</mediatype><trackindex>1</trackindex><clipindex>{n}</clipindex><groupindex>1</groupindex></link>")
        common = f"<name>{escape((src+': '+c['text'])[:60])}</name><enabled>TRUE</enabled><duration>{sdur}</duration>{rate(FPS)}<start>{t}</start><end>{t+d}</end><in>{fi}</in><out>{fo}</out>"
        fd = filedef(src) if src not in done else f'<file id="{IDS[src]}"/>'; done.add(src)
        lab = f"<labels><label2>{c['col']}</label2></labels>"
        V.append(f'<clipitem id="{v}">{common}{fd}<compositemode>normal</compositemode>{links}{lab}</clipitem>')
        Au.append(f'<clipitem id="{au}">{common}<file id="{IDS[src]}"/><sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack>{links}{lab}</clipitem>')
        t += d
    sc = f"<samplecharacteristics>{rate(FPS)}<width>1920</width><height>1080</height><anamorphic>FALSE</anamorphic><pixelaspectratio>square</pixelaspectratio><fielddominance>none</fielddominance></samplecharacteristics>"
    seq = (f'<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4"><sequence id="sequence-1"><name>{escape(a.name)}</name><duration>{t}</duration>{rate(FPS)}'
           f'<media><video><format>{sc}</format><track>{"".join(V)}<enabled>TRUE</enabled><locked>FALSE</locked></track></video>'
           f'<audio><numOutputChannels>2</numOutputChannels><format><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics></format>'
           f'<track>{"".join(Au)}<enabled>TRUE</enabled><locked>FALSE</locked></track></audio></media>'
           f'<timecode>{rate(FPS)}<string>00:00:00:00</string><frame>0</frame><displayformat>NDF</displayformat></timecode>{"".join(M)}</sequence></xmeml>')
    open(a.out + '.xml', 'w').write(seq); open(a.out + '.txt', 'w').write('\n'.join(txt)); print('length', tcs(t), n, 'clips')

# ---------- edl compare ----------
def cmd_edl(a):
    sp = load_spec(a.spec); FILES = {sp['MAIN']['name']: sp['MAIN'], **sp['TESTIMONIALS']}
    byfile = {re.split(r"[\\/]", f['path'])[-1]: (n, f['fps']) for n, f in FILES.items()}; main = sp['MAIN']['name']
    W = load_words(a.words); C = json.load(open(a.clips)); RF = sp.get('SEQ_FPS', 25)
    ev, cur = [], None
    for l in open(a.edl, errors='ignore'):
        m = re.match(r"\s*(\d{3,6})\s+\S+\s+(\S+)\s+(?:C|K B)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)", l)
        if m: cur = dict(trk=m[2], s=(m[3], m[4]), r=(m[5], m[6]), clip=None); ev.append(cur); continue
        m = re.match(r"\* FROM CLIP NAME:\s*(.+)", l)
        if m and cur and cur['clip'] is None: cur['clip'] = m[1].strip()
    seen, D = set(), []
    for e in ev:                                   # audio events only (V-only = b-roll/graphics)
        if 'A' not in e['trk'] or e['clip'] not in byfile or e['r'][0] in seen: continue
        seen.add(e['r'][0]); n, f = byfile[e['clip']]
        D.append(dict(src=n, i=tc(e['s'][0], f), o=tc(e['s'][1], f), ri=tc(e['r'][0], RF)))
    D.sort(key=lambda x: x['ri'])
    ov = lambda x, y: x['src'] == y['src'] and min(x['o'], y['o']) - max(x['i'], y['i']) > 0.08
    for d in D:
        d['m'] = [k for k, c in enumerate(C) if ov(d, c)]
        d['text'] = (' '.join(w['w'].strip() for w in W if w['e'] > d['i'] + .03 and w['s'] < d['o'] - .03) if d['src'] == main
                     else (C[d['m'][0]]['text'][:60] if d['m'] else '?'))
    print("== ADAM'S ORDER (cut time | my clip # | my section | src | words)")
    for d in D:
        s = C[d['m'][0]]['sec'] if d['m'] else 'NEW'
        print(f"{int(d['ri']//60)}:{d['ri']%60:04.1f} {str(d['m'][:2]):10s} {s[:14]:14s} {d['src'][:3]} {d['text'][:90]}")
    used = {k for d in D for k in d['m']}
    print("\n== DROPPED"); [print(f"  #{k} {c['sec'][:14]} {c['src'][:3]} {c['text'][:90]}") for k, c in enumerate(C) if k not in used and c['o']-c['i'] > .3]
    print("\n== ADDED");   [print(f"  {int(d['ri']//60)}:{d['ri']%60:04.1f} {d['src'][:3]} {d['i']:.1f}-{d['o']:.1f} {d['text'][:90]}") for d in D if not d['m']]
    di, do = [], []
    for c in C:
        if c['src'] != main: continue
        hs = [d for d in D if ov(d, c)]
        if hs: di.append(min(h['i'] for h in hs) - c['i']); do.append(c['o'] - max(h['o'] for h in hs))
    if di:
        print(f"\n== EDGES ({len(di)} main-speaker clips): in-point median {np.median(di)*1000:.0f}ms later, out-point median {np.median(do)*1000:.0f}ms earlier;",
              sum(1 for c in C if c['src'] == main and len([d for d in D if ov(d, c)]) > 1), "of my clips split into 2+ pieces")
    print(f"length: mine {sum(c['o']-c['i'] for c in C)/60:.2f} min, Adam's {sum(d['o']-d['i'] for d in D)/60:.2f} min")

p = argparse.ArgumentParser(); s = p.add_subparsers(dest='c', required=True)
x = s.add_parser('asr'); x.add_argument('audio'); x.add_argument('out'); x.set_defaults(f=cmd_asr)
x = s.add_parser('tlines'); x.add_argument('spec'); x.add_argument('name'); x.set_defaults(f=cmd_tlines)
x = s.add_parser('build'); [x.add_argument(k) for k in ('spec', 'words', 'wav', 'out')]
x.add_argument('--lead', type=float, default=.02); x.add_argument('--trail', type=float, default=.10); x.add_argument('--pause', type=float, default=.25); x.set_defaults(f=cmd_build)
x = s.add_parser('xml'); x.add_argument('spec'); x.add_argument('clips'); x.add_argument('out'); x.add_argument('--name', default='Claude VSL cut'); x.set_defaults(f=cmd_xml)
x = s.add_parser('edl'); [x.add_argument(k) for k in ('spec', 'words', 'clips', 'edl')]; x.set_defaults(f=cmd_edl)
a = p.parse_args(); a.f(a)
```

Save this as `vsrt.py` (captions and the EDL-to-txt helper):

```python
#!/usr/bin/env python3
"""Captions + helper for the VSL cutter (pairs with vcut.py).
  edltxt EDL FPS PREMIERE.json OUT.txt         Premiere-style txt of a finished edit (no txt export needed)
  tokens spec.py clips.json OUTDIR             word tokens in sequence time -> OUTDIR/toks.json, lines.json, draft.txt
  srt    OUTDIR fixed.txt OUT.srt [--max 42]   align hand-fixed text (one line per draft line) -> SRT
Fix draft.txt by hand (keep one line per line): £ with digits (£40,000, £5.20, £1,200), commas from 1,000,
full stops, names (Sandra -> Sander), best-guess mis-hears. Never add or drop a line.
"""
import json, re, sys, math, difflib, argparse

def tc(s, fps):
    h, m, x, f = map(int, re.split(r"[:;]", s)); return h*3600 + m*60 + x + f/fps
def pj(path):                                    # Premiere transcript JSON -> [(s, e, word)], fillers blank
    d = json.load(open(path)); W = []
    for seg in d['segments']:
        for w in seg['words']:
            t = w['text'] if w.get('type', 'word') == 'word' else ''
            if 'disfluency' in (w.get('tags') or []): t = ''
            W.append((w['start'], w['start'] + w['duration'], t.strip()))
    return W

def cmd_edltxt(a):
    fps = a.fps; W = pj(a.json); seen = set(); out = []
    for l in open(a.edl, errors='ignore'):
        m = re.match(r"\s*(\d{3,6})\s+\S+\s+(\S+)\s+(?:C|K B)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)", l)
        if not m or 'A' not in m[2] or m[5] in seen: continue
        seen.add(m[5]); si, so = tc(m[3], fps), tc(m[4], fps)
        words = ' '.join(w for s, e, w in W if w and e > si + .03 and s < so - .03)
        out.append(f"{m[5]} - {m[6]}\nUnknown\n{words}")
    open(a.out, 'w').write('\n\n'.join(out) + '\n'); print(len(out), 'events')

def cmd_tokens(a):
    ns = {}; exec(open(a.spec).read(), ns); FPS = ns.get('SEQ_FPS', 25); main = ns['MAIN']['name']
    wp = a.words; d = json.load(open(wp))             # main speaker: whisper words.json or Premiere JSON
    SRCW = {main: pj(wp) if isinstance(d, dict) else [(w['s'], w['e'], w['w'].strip()) for w in d]}
    for n, v in ns['TESTIMONIALS'].items():
        if v.get('words'): SRCW[n] = pj(v['words'])
    C = json.load(open(a.clips)); toks = []; t = 0; prev = None
    for c in C:
        fi, fo = round(c['i']*FPS), round(c['o']*FPS); d = fo - fi
        if d <= 0: continue
        i, o = fi/FPS, fo/FPS
        newline = prev is None or c['src'] != prev['src'] or abs(c['i'] - prev['o']) > 2.5 or c['sec'] != prev['sec']
        ws = [w for w in SRCW[c['src']] if w[2] and w[1] > i + .03 and w[0] < o - .03]
        for k, (s, e, w) in enumerate(ws):
            toks.append(dict(w=w, s=t/FPS + max(0, s - i), e=t/FPS + min(d/FPS, e - i), line=newline and k == 0))
        t += d; prev = c
    lines = []
    for k, x in enumerate(toks):
        if x['line'] or not lines: lines.append([])
        lines[-1].append(k)
    json.dump(toks, open(f"{a.outdir}/toks.json", 'w')); json.dump(lines + [[t/FPS]], open(f"{a.outdir}/lines.json", 'w'))
    open(f"{a.outdir}/draft.txt", 'w').write('\n'.join(' '.join(toks[k]['w'] for k in L) for L in lines) + '\n')
    print(len(toks), 'words,', len(lines), 'lines; edit draft.txt into fixed.txt')

def cmd_srt(a):
    T = json.load(open(f"{a.dir}/toks.json")); LINES = json.load(open(f"{a.dir}/lines.json")); END = LINES.pop()[0]
    FIX = open(a.fixed).read().strip().split('\n'); assert len(FIX) == len(LINES), (len(FIX), len(LINES))
    n = lambda w: re.sub(r"[^a-z0-9]", "", w.lower()); caps = []; MAX = a.max
    for L, fx in zip(LINES, FIX):
        ow = [T[k] for k in L]; nw = fx.split(); ts = [None]*len(nw)
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, [n(t['w']) for t in ow], [n(w) for w in nw], autojunk=False).get_opcodes():
            if tag == 'equal':
                for d in range(i2 - i1): ts[j1+d] = (ow[i1+d]['s'], ow[i1+d]['e'])
            elif tag == 'replace' and i2 > i1:     # spread the replaced span's time over the new words
                s0, e0 = ow[i1]['s'], ow[i2-1]['e']; m = j2 - j1
                for d in range(m): ts[j1+d] = (s0 + (e0-s0)*d/m, s0 + (e0-s0)*(d+1)/m)
        for j in range(len(nw)):                   # interpolate inserted words
            if ts[j] is None:
                p = next((ts[x][1] for x in range(j-1, -1, -1) if ts[x]), ow[0]['s'])
                q = next((ts[x][0] for x in range(j+1, len(nw)) if ts[x]), ow[-1]['e'])
                ts[j] = (p, max(p, q))
        sents, cur = [], []
        for w in zip(nw, ts):
            cur.append(w)
            if re.search(r"[.?!:]$", w[0]): sents.append(cur); cur = []
        if cur: sents.append(cur)
        merged = []
        for st in sents:                           # merge short sentences when they fit one caption
            if merged and len(' '.join(x for x, _ in merged[-1] + st)) <= MAX: merged[-1] += st
            else: merged.append(st)
        for st in merged:                          # balanced one-line chunks, prefer breaking after commas
            i = 0
            while i < len(st):
                rem = ' '.join(x for x, _ in st[i:]); left = math.ceil(len(rem)/MAX); target = len(rem)/left
                j, ln, cands = i, 0, []
                while j < len(st):
                    ln += len(st[j][0]) + (1 if j > i else 0)
                    if ln > MAX and j > i: break
                    cands.append((j, ln)); j += 1
                end = len(st) - 1 if left == 1 else min(cands, key=lambda c: abs(c[1] - target) - (8 if st[c[0]][0].endswith(',') else 0))[0]
                ch = st[i:end+1]; caps.append([' '.join(x for x, _ in ch), ch[0][1][0], ch[-1][1][1]]); i = end + 1
    for k, c in enumerate(caps):                   # min 0.7s, hold 0.25s, no overlap, clamp to sequence end
        nxt = caps[k+1][1] if k + 1 < len(caps) else END
        c[2] = min(max(c[2] + .25, c[1] + .7), nxt - .02) if nxt - .02 > c[1] else c[2]
        c[2] = min(c[2], END)
    f = lambda x: f"{int(x//3600):02d}:{int(x//60)%60:02d}:{int(x%60):02d},{int(round((x%1)*1000))%1000:03d}"
    open(a.out, 'w').write('\n'.join(f"{k+1}\n{f(s)} --> {f(e)}\n{t}\n" for k, (t, s, e) in enumerate(caps)))
    print(len(caps), 'captions; longest', max(len(c[0]) for c in caps), 'chars; bad timings', sum(c[2] <= c[1] for c in caps))

p = argparse.ArgumentParser(); s = p.add_subparsers(dest='c', required=True)
x = s.add_parser('edltxt'); x.add_argument('edl'); x.add_argument('fps', type=int); x.add_argument('json'); x.add_argument('out'); x.set_defaults(f=cmd_edltxt)
x = s.add_parser('tokens'); x.add_argument('spec'); x.add_argument('clips'); x.add_argument('outdir'); x.add_argument('--words', required=True); x.set_defaults(f=cmd_tokens)
x = s.add_parser('srt'); x.add_argument('dir'); x.add_argument('fixed'); x.add_argument('out'); x.add_argument('--max', type=int, default=42); x.set_defaults(f=cmd_srt)
a = p.parse_args(); a.f(a)
```
