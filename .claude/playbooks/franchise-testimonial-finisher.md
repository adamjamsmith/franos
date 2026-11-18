
# Franchise testimonial finisher (v1.0)

Adam (Franchise Right) wants to stop paying for Adobe. This playbook takes a testimonial cut that already exists as a Premiere XML (made with `franchise-testimonial-cutter`, with B-roll placed by `broll-cataloguer`) and renders the **finished ad** itself: picture, sound, captions, name title and end card. No Premiere step.

The Premiere route still exists. The cutter playbook still makes XML for Adam to finish in Premiere when he wants to. Use this playbook when Adam asks for a finished video, a "Claude finished" version, or a no-Premiere build.

Built on Oven Rescue, David Sandelands (Nov 2026): v1 → v3 with Adam's notes, v3 signed off. Every rule below comes from his feedback.

---

## 1. Adam's rules (all automatic in the toolkit)

1. **No zooming** in and out on jump cuts.
2. **No text on screen** except the name title card when they introduce themselves, and captions. No number boxes or callouts.
3. **Never chop a word.** Finish the last word at an out-point, catch the start of the first word at an in-point. A sliver of the next word at an out-point also sounds chopped ("customers" + 100ms of "on"), so cut before it.
4. **Never add a word** that the cut had removed ("you know", "sort of", "so"). Fixes only finish sounds; they never start a new word.
5. **B-roll starts on the cut**, or clearly after it. It never starts 1–8 frames late, and never ends 1–8 frames before a cut.
6. **No flash frames.** No visible shot (face or B-roll) shorter than 12 frames. A short face gap between B-roll is covered by holding the B-roll.
7. **B-roll stays inside its own shot** (from the catalogue). It never runs into the next shot in the source footage, which can be a talking head from another testimonial. If a shot is too short, slide it, then slow it (to about 65% at most).
8. **Hide the interviewer.** Zoom-style recordings switch to Adam when he speaks. Those frames are replaced by the franchisee's frames played backwards (Adam's idea), so nobody else ever appears.
9. **Captions are what is said**, nothing more. Never "30 to 33%" when he only said "33%", never "..." in place of a word.
10. **End card:** brand colour, small logo top left, headline and button on the left half, prospectus mockup on the right. Oven Rescue wording: "Download the Oven Rescue prospectus" / button "Fill in the form below".
11. Sound is levelled to -16 LUFS. No music.

## 2. Inputs

- **The cut timeline**: the `...-Broll-vN.xml` (V1 interview, V2 B-roll, A1 interview audio). If there's no B-roll version yet, use the plain cut XML; there will just be no B-roll.
- **The interview video**, and every B-roll source file the XML points at. Stage **one file per call** for anything over about 150MB. Files over 400MB won't stage: ask Adam for a 1080p export.
- **The B-roll catalogue CSV** from `broll-cataloguer` (shot bounds). Without it, B-roll is kept inside the clip's own in/out.
- **Brand**: logo (crop it tight to the artwork), main colour, and the prospectus mockup (closed). If there's no mockup, make one with `prospectus-mockup` and save it to the client's Mockups folder.
- **The title card**: name (check the spelling against memory and the folder name; Adam's own V1 had a typo), territory line, and when they say their name (seconds on the original timeline).
- **A names hint** for the transcriber: brand, franchisee name, territory, head-office people, product words (e.g. "Oven Rescue, David Sandelands, Derbyshire, Charlie, Mark, Oliver, an Aga, franchisee, turnkey.").

## 3. Setup (once per session)

1. Request `Documents\Franchise Right` and stage `Tools\testimonial-finisher-toolkit.zip`. Unzip into a fresh working folder (`tf/`).
2. `pip install faster-whisper --break-system-packages` (downloads `small.en` once).
3. `cd tf/remotion && npm install && npx remotion browser ensure`. Remotion is free for Franchise Right (companies up to 3 people).
4. Copy the client logo to `remotion/public/logo.png` and the mockup to `remotion/public/mockup-closed.png`. Fill `remotion/src/data.json`: brand colour, title name and line, end-card wording.

## 4. The build (about 10–15 minutes, runs unattended)

WORK = a work folder, X = the XML, DIRS = the folders the sources are staged in, separated by `|`.

1. **Prep**: `python3 prep_source.py interview.mp4 X WORK`. It reports how many other-person frames sit inside the cut.
2. **Word timings**: `python3 word_edges.py X WORK/src16.raw WORK/words.json`.
3. **Original sound, for comparison**: `python3 build_edit.py --xml X --src-dirs DIRS --work WORK --out PLAIN --plain`, then `python3 check_words.py PLAIN/sound_plain.raw WORK/heard_plain.json`.
4. **Build**: `python3 build_edit.py --xml X --src-dirs DIRS --work WORK --out B1 --catalogue CAT --title-at <sec> [--overrides WORK/overrides.json]`. `changes.txt` lists every word fix, B-roll snap, covered flash and hidden interviewer frame.
5. **Listen-back** (repeat until 0):
   - Convert to 16kHz raw: `ffmpeg -i Bn/sound.m4a -ac 1 -ar 16000 -f s16le WORK/heardN.raw`.
   - `python3 check_words.py WORK/heardN.raw WORK/heard_bN.json`.
   - `python3 listen_back.py WORK/heard_plain.json WORK/heard_bN.json Bn/edges.json WORK/rev_new.json`.
   - Merge `rev_new.json` into `WORK/revert.json` and rebuild with `--revert WORK/revert.json`.
   - David took 3 rounds (21 edges undone).
6. **Captions**:
   - Transcribe the final sound with the names hint: `python3 check_words.py WORK/heardN.raw WORK/heard_cap.json "<names hint>"`.
   - Then `python3 build_captions.py WORK/heard_cap.json <cut list .txt or an approved .srt> Bn/captions.ass '<fixes json>'`.
   - **Proofread `captions.ass.txt`** against the cut list, line by line. Fix mishears with the fixes JSON ("cook a coffee" → "cup of coffee", "argon" → "Aga", "made up again" → "made redundant again") and re-run. Keep his words: don't tidy his grammar, and don't add anything he didn't say. Check £ signs, % and names.
7. **Graphics**, from `remotion/`:
   - `npx remotion render src/index.ts TitleCard title.mov --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png --concurrency=2`
   - `npx remotion render src/index.ts EndCard endcard.mp4 --codec=h264 --crf=18 --concurrency=2`
   - Check a still of the end card before going on.
8. **Finish**: `python3 finish.py Bn Bn/captions.ass title.mov endcard.mp4 remotion/public FINAL.mp4` (about 40 seconds).
9. **Check**: `python3 check_video.py FINAL.mp4 WORK`.
   - Interviewer frames must be 0.
   - Look at every short shot it lists in a strip of frames: a real flash must be fixed.
   - Then pull a contact sheet of about 9 frames (title card, B-roll, captions, end card) and look at it.

Don't send anything to Adam until steps 5, 6 and 9 are clean.

## 5. Adam's notes → overrides

When Adam says a word is cut early or a word is missing (e.g. "cuts too early on 'weeks' and the I of I can't do it"):
- Find the clip edges in source seconds (`words.json` plus the levels).
- Add them to `WORK/overrides.json` as `{"out": [[old, new]], "in": [[old, new]]}` and rebuild.
- Overrides are applied after reverts, so listen-back never undoes them.
- A short word said just before a pause and repeated ("and I… I can't") is often outside the automatic 150ms reach. That needs an override.

## 6. Output

- Name: `<Brand>-<Name>-ClaudeFinished-vN.mp4`, 1280×720, 30fps.
- Save it next to Adam's exports (Oven Rescue: `websites\Oven Rescue\Testimonials Exported\`). Send it with SendUserFile, then commit it with the file UUID: committing a staged path fails.
- Tell Adam what changed, and list any caption lines you weren't sure of so he can listen to those.

## 7. Gotchas

- **Off-by-one frames.** The Oven Rescue Zoom recordings have a duplicated first frame. A seek to `f/fps` can land a frame late, which showed Adam for one frame. The toolkit seeks to `f/fps - 0.010` and lines up the other-person flags by timestamps. Keep both.
- **Speech-to-text word times are only roughly right.** Snapping cuts to its word boundaries made things worse: it added and dropped words. Fixes use the sound level (extend to the next natural dip, at most 200ms out and 150ms in), and word times only act as a veto. Listen-back is what makes it safe.
- The workspace has 2 CPUs. Rendering the whole video in Remotion took 7 minutes, so ffmpeg builds the edit and Remotion only makes the title and end card.
- The cut list's text carries recogniser artefacts ("get -go"). `build_captions.py` re-joins those and adds £ to amounts. The proofread catches the rest.
- Captions from an old .srt can be wrong about what is said. The words come from the finished audio; reference files only give spellings.
- Example inputs from David are in `tf/examples/oven-rescue-david/`.

## 8. Improve

After each video, add Adam's notes to section 1 or 5. Fix the toolkit if a rule needs code, re-zip it to `Tools\testimonial-finisher-toolkit.zip`, and propose an updated version of this playbook.
