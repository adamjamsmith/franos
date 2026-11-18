
# Franchise testimonial cutter (v1.1)

Adam (Franchise Right) sells franchises for franchisors using franchisee video testimonials. This playbook turns a 45–60 minute interview into a short ad cut that sells the opportunity. It is built from seven cuts: Gary (Leather Hero), David, Mike and Trevor (Oven Rescue), and Lou and Sander (Local Treasures). Each time, Claude's cut was compared with Adam's final edit in Premiere.

If the "Testimonial Cutter" project is attached, read `claude/testimonial-cutting-process.md` for the worked examples behind each rule (sections 12–19). This file is the distilled version.

---

## 1. What the cut is for

- It's a Facebook ad. Its one job is to make a stranger think **"this could be me"** and book a call. On-screen text handles the call to action.
- **Viewer:** a layman, middle-aged, often a professional or manager, maybe made redundant. They want to be their own boss. They know nothing about franchising.
- **The test for every line:** imagine the viewer has ADHD. Does this line make them *more* excited than the last one? And: "How do I say this as simply as possible, so anyone can understand it?"
- **Length:** about 2:30–3:00, roughly 4–6% of the interview. A short cut is fine when the interview is weak. Long, interesting stories go in a separate long edit.

## 2. The workflow (follow it in order)

**Inputs to ask for:**
- Premiere's transcript JSON, exported next to the video. It has word timings and disfluency tags, so prefer it to transcribing yourself.
- An MP3 export of the audio, used for gap trimming.
- The video's full Windows path on Adam's PC, its fps and its duration in frames. Get these from the video file (ffprobe on a staged copy) or from his .prproj.
- The brand.

If the session is linked to his computer, read these from his folder and write the XML back there. Video files over about 350MB time out when staged, so use the JSON and MP3 instead.

1. **Beat map.** Sort the whole interview into mini-stories (who, low/before, found it, model, money, marketing, demand, training, support, future, advice), each with a time range. Rate each ★★★ gold, ★★ useful, or ★ skip. List what to drop: second plots, other brands, dark stories.
2. **Section 1 as text:** hook, who, low → high. Spend the most time here. Show the text with source times, `[mm:ss] words / [mm:ss] words`.
3. **Add sections one at a time,** rereading as you go: merge, reprioritise, trim.
4. **Sweep** the full transcript for missed gold and repeats.
5. **Story pass:** read it aloud. It must sound like one person telling one story, not a set of good clips.
6. **Adam reviews the text.** Apply his notes. Don't build the XML until he's happy with the text.
7. **Build the XML** with the toolkit (section 8): phrase spec → find → gap-trimmed clips → xmeml. Write it to his folder as `<Brand>-<Name>-ClaudeCut-vN.xml` with a matching `.txt`. No MP3 preview is needed.
8. **Adam edits in Premiere and sends the EDL.** Decode it (`tcut.py edl`), compare it with your cut, and report what he changed, grounded in the data rather than guesses. Cover reorders, cuts, added lines, and in/out points.
9. **Improve.** Add the lessons to the project's process doc as a new section. Then update this playbook file itself, with the rule changes merged into sections 3–7, not just appended.

## 3. Story shape

**Keep it simple: low, then high.** "I was here (low, simple), now I'm here (high, big, good), and here's why it works." Never more than one plot.

Running order that has worked (adjust it to the material, ordered by value):

1. **Hook, 0–6s:** where they are now plus where they're going. Give the current number, then the future number, each with a time frame. Lift the future line forward from late in the interview.
   - "On Oven Rescue we're doing over 5,000 a month. Two vans, next year, could be doing 100K turnover."
   - "This year it's going to be 50,000 pounds. My aim is to double that by this time next year."
   - For a revenue business: revenue now → best month → potential per area → achievable next year.
2. **Who:** name and territory, plus one context line ("coming up for one year"). This is context only, around 0:06–0:30.
3. **The turn / low → high,** placed side by side with nothing in between. "Come Covid, I had to liquidate. I had to do something, and I'm extremely happy." The conclusion can come before the backstory ("Work for anybody else again? No way. Not a chance."), then the redundancy. Compress the low to its essentials. Call out the avatar (redundancy, age).
4. **Credit straight after the high:** one line praising the franchisors.
5. **Result, then the model.** Put a concrete result first: a real job with its profit ("big decking job, just under three and a half grand… walking away with a thousand pounds in profit… 3 or 4 of those a month"). Then explain the model **through the franchisee's own path, not a label.** For example: on the tools now → "my goal is to step away and become a fully fledged business owner" → how the model gets him there (specialise, subcontract, the team). Labels like "agency" or "home services company" make the viewer decode; the goal line does the framing. The model must be clear before the team section, or it sounds like a tradesman getting leads. If he doesn't do the work himself, say so plainly ("I employed someone from the get-go").
6. **Marketing,** usually the engine ("the fire to the engine"). Drill into it. If a brand's marketing is weak, lead with its strongest proof instead.
7. **Money and the job:** best figures, ticket sizes, a stand-out job.
8. **Demand, proof, lifetime value:** repeat customers, reviews (naming the platform is fine), an oven in every house.
9. **Can I do it:** training, age paired with ease ("I'm 65… home for 2:00 nearly every day").
10. **Support:** the franchisors' character, ideally them reassuring him through a worry. End the section on a verdict ("I wouldn't be doing this on my own").
11. **A turn to the viewer,** as a bridge rather than an opener ("Someone in a van on their own… 5,000 a month. Easy.").
12. **The future:** more vans, sell up, retire. Call back to the hook number.
13. **Close on reassurance and an open door:** "speak to Charlie and Mark… they could speak to me, I could show them a calendar… you're never on your own." Use their own call to action only if they said one.

**How each mini-story is built:**
- Open with a clear statement, then the detail, then a conclusion line.
- Follow action → result → good problem → next step. A good problem is a killer line: "lost three jobs today", "dropped to £5 a day so I'm not inundated".
- End on something that leads into the next section.
- The payoff goes last.
- **Doubt, then decision, then payoff** beats plain praise ("a bit nervous… let's go for it… it's gone to plan"). Always keep the payoff line.
- **Answer an objection straight away, with numbers.** "£20 a day seems a lot. However, 4–5 ovens a day at £80…"
- **Repeat on purpose:** key numbers and phrases two or three times, each in a new context.
- **Order for flow.** When two lines are equally strong, pick the one that leads into the next.

## 4. Keep

- The **best** figures (a range over an average, best month, booked weeks ahead), each with a time frame. If a number has no time frame, lift one from elsewhere ("next year").
- Proof the marketing works from day one.
- Objections that come with their answer. Worries that come with their payoff.
- Humour and light-heartedness. It puts the viewer at ease, so always look for the funny lines ("they all know I'm a dinosaur").
- An invitation ("call me, come out with me").
- Agreement with the interviewer's leading question is fair game ("1,000,000%").
- Plain, explicit lines over clever ones.

## 5. Cut

- **The interviewer, always.**
- Hedges and filler: "sort of", "I think", "pretty", "you know", "I'm usually", stammers.
- **Second plots:** a different storyline, such as a network takeover (Trevor) or buying an existing or second territory (Sander). A supporting example that explains the main story is not a second plot. Other franchisees specialising in one service showed how the model works, and it stayed.
- Other brands and businesses, even in the middle of a good line.
- Dark or complicated stories (hospital, illness detail), unless they're the low and kept minimal.
- Negatives and slow starts, unless they come with a payoff. Worries that raise a new objection ("the percentage you give back").
- Honesty claims: "I'm not lying", "I'll only tell the truth".
- Names that mean nothing to the viewer ("Rose does it for me"). Names stay only in the "people you can call" close.
- Explanations when the result already carries the point. Bloat, repeats, lines that say nothing.
- Details the avatar doesn't need ("31 years in sales, suit and tie", exact dates).
- Anything a layman wouldn't get first time, such as ad-spend ROI maths.

## 6. Splicing

- Splicing at word level from anywhere is allowed: a single word ("before", "Oliver", "next year", "another"), clips as short as 5 frames. Use it to add connective words and time frames, or to turn a statement into a question and answer.
- **Never** make them say something they didn't say or mean, and never invent words. Every word must exist in the transcript, and you give its source time.
- **Try the natural sentence first.** It beat Claude's constructed versions in nearly every test (Lou's hook, Mike's "what I did before"). Heavy Frankenstein lines that sound forced are worse than none.
- **Three-piece sentences are risky,** especially at the start of a section. Prefer whole sentences and keep lines in their original context.
- Use the franchisee's echo of the question as a signpost ("What I did before: franchisee driver for DPD").
- Trim leading words for punch ("people will call me", not "I have people who will call me").
- Plain English: "I'll make", not "the income will be".
- 80/20: once it's good, stop. Endless reordering adds little.

## 7. Brand notes

- **Charlie and Mark brands** (Leather Hero, Oven Rescue). Marketing is Facebook ads run by head office, which is the main proof. Praise Charlie and Mark by name in support and the close. Never mention Enviro Clean, the takeover of the previous network or its previous owner, or other franchise systems by name.
- **Local Treasures** (Sarah and Nick). It's an agency for home services. Self-employed "treasures" do the work, customers pay Local Treasures, and the franchisee takes commission. There are no staffing overheads, and treasures are paid the same day. The selling theme: start by doing some of the work yourself (low cost, early income), then grow into a management franchise worth £100k+ over a few years, without the £30–40k upfront cost and overheads of a typical management franchise. Running order that worked for Sander: found it → a concrete job and its profit → "on the tools whilst growing the business" → goal: step away and become a business owner → how: franchisees specialise in one service, subcontract the rest → the treasures (biggest asset, no staffing overhead, they sell on my behalf) → Sarah and Nick → close.
- For a new brand, ask Adam for the selling theme of the opportunity before cutting.

## 8. Technical method

Save the toolkit below as `tcut.py`. It needs numpy. ffmpeg converts the MP3:
`ffmpeg -y -i audio.mp3 -ac 1 -ar 16000 audio.wav`

```bash
python3 tcut.py words "Name.json" words.json                 # Premiere transcript -> words
python3 tcut.py find words.json spec.py frags.json             # prints the script with source times
python3 tcut.py clips words.json frags.json audio.wav clips.json
python3 tcut.py xml clips.json "/mnt/user-data/outputs/Brand-Name-ClaudeCut-v1" \
    --video "C:\Users\Adam Smith\...\video.mp4" --fps 30 --dur 90726 --name "Name - Claude cut v1"
python3 tcut.py edl words.json "Adam's cut.edl" --fps 30        # decode his edit back to words
```

**spec.py** is the cut, written as phrases with approximate source times in seconds. The finder picks the occurrence nearest that time, within 150s, and skips filler tokens:

```python
S = [
 ("1 Hook", "Mango", [                                   # (section, Premiere label colour, lines)
   [(1560, "i've had 12 grand months")],                  # one line = list of fragments
   [(1610, "why couldn't we do a minimum of 25 grand a month"), (1632, "and that's per area")],
 ]),
 ("2 Who", "Violet", [
   [(128, "i started with sarah nick", "as the first franchisee in july 2024")],  # start … end phrase
   [(2700, "and next year we'll do", {"skip": 1})],       # drop the first word ("and")
 ]),
]
```

Label colours: Violet, Iris, Caribbean, Lavender, Cerulean, Forest, Rose, Mango, Purple, Blue, Teal, Magenta, Tan, Green, Brown, Yellow. Use one per section. Each section also gets a sequence marker.

**Cut-point calibration** (measured from Adam's edits):
- Adam cuts right at the speech, about 0ms before the first word and after the last.
- The defaults are a 20ms lead and a 50ms tail, splitting at fillers and at pauses over 0.3s.
- Onset uses the RMS threshold. Offset uses half the threshold, so soft s/f/th/h endings survive.
- Edges are clamped to the neighbouring words so nothing bleeds in.
- **Err slightly loose:** a clipped word can't be recovered, but a loose edge is a two-second trim.
- Adam removes the remaining gaps himself, so don't over-tighten.

**Gotchas:**
- Digits split as "5" ",000" are merged by `words`.
- Never name a script `xml.py`, because it shadows the stdlib module.
- The XML must use `file://localhost/C:/...` with spaces as `%20`. The toolkit does this.
- An EDL's record timecodes follow the sequence fps (often 23.976), so trust the source timecodes, which are at the clip's fps.
- Premiere EDLs can list the same event as separate V, AA and NONE lines; keep one per record timecode when decoding.
- If there's no Premiere JSON, transcribe with faster-whisper (`small.en`, `word_timestamps=True`, passing a numpy array from the WAV), then convert to the same `{s, e, w}` list.

```python
#!/usr/bin/env python3
"""Testimonial cutter toolkit.
  words  <premiere.json> words.json            Premiere transcript -> flat word list
  find   words.json spec.py frags.json         phrase spec -> word ranges (prints the script)
  clips  words.json frags.json audio.wav clips.json [--lead .02 --trail .05]
  xml    clips.json out_base --video "C:\\path\\video.mp4" --fps 30 --dur FRAMES [--w 1920 --h 1080 --name NAME]
  edl    words.json cut.edl --fps 30               decode an EDL back to words
"""
import json, re, sys, argparse

def norm(s): return re.sub(r"[^a-z0-9%']", "", s.lower())

# ---------- words ----------
def cmd_words(a):
    d = json.load(open(a.src)); W = []
    spk = {s.get('id'): s.get('name') for s in d.get('speakers', [])}
    for seg in d['segments']:
        for w in seg['words']:
            t = w['text'] if w.get('type', 'word') == 'word' else ''
            if 'disfluency' in (w.get('tags') or []) and not t.strip(): t = ''
            W.append(dict(s=w['start'], e=w['start'] + w['duration'], w=' ' + t, spk=seg.get('speaker')))
    # merge "5" ",000" style splits
    out = []
    for w in W:
        if out and re.fullmatch(r"[,.]?\d{3}\W*", w['w'].strip()) and re.search(r"\d$", out[-1]['w'].strip()):
            out[-1]['w'] += w['w'].strip(); out[-1]['e'] = w['e']
        else: out.append(w)
    json.dump(out, open(a.dst, 'w')); print(len(out), 'words')

# ---------- find ----------
def finder(W):
    T = [norm(w['w']) for w in W]
    def match(seq, i):
        j = i; k = 0
        while k < len(seq) and j < len(T):
            if T[j] == seq[k]: j += 1; k += 1
            elif T[j] == "": j += 1
            else: return None
        return j - 1 if k == len(seq) else None
    def find(p, near, lim=150):
        seq = [norm(x) for x in p.split() if norm(x)]; best = None
        for i in range(len(T)):
            if T[i] != seq[0]: continue
            e = match(seq, i)
            if e is not None:
                d = abs(W[i]['s'] - near)
                if best is None or d < best[0]: best = (d, i, e)
        if best is None or best[0] > lim: raise SystemExit(f"NOT FOUND: '{p}' near {near}s (best {best})")
        return best[1], best[2]
    def find_after(p, a, span=250):
        seq = [norm(x) for x in p.split() if norm(x)]
        for i in range(a, min(a + span, len(T))):
            if T[i] == seq[0]:
                e = match(seq, i)
                if e is not None: return e
        raise SystemExit(f"END NOT FOUND: '{p}' after word {a}")
    return find, find_after

def cmd_find(a):
    W = json.load(open(a.words)); ns = {}
    exec(open(a.spec).read(), ns); S = ns['S']
    find, find_after = finder(W); out = []
    txt = lambda i, j: ' '.join(W[k]['w'].strip() for k in range(i, j + 1) if W[k]['w'].strip())
    for sec, col, lines in S:
        print(f"\n## {sec} [{col}]")
        for line in lines:
            parts = []
            for it in line:
                near, sp = it[0], it[1]
                ep = it[2] if len(it) > 2 and isinstance(it[2], str) else None
                opt = it[-1] if isinstance(it[-1], dict) else {}
                i, j = find(sp, near)
                if ep: j = find_after(ep, i)
                for _ in range(opt.get('skip', 0)):        # drop N leading words
                    i += 1
                    while not W[i]['w'].strip(): i += 1
                out.append(dict(sec=sec, col=col, a=i, b=j))
                s = W[i]['s']; parts.append(f"[{int(s//60)}:{s%60:04.1f}] {txt(i, j)}")
            print('  ' + ' / '.join(parts))
    json.dump(out, open(a.frags, 'w')); print('\n', len(out), 'fragments')

# ---------- clips (gap trim from audio) ----------
def cmd_clips(a):
    import wave, numpy as np
    W = json.load(open(a.words)); F = json.load(open(a.frags))
    wf = wave.open(a.wav); sr = wf.getframerate(); ch = wf.getnchannels()
    A = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    if ch > 1: A = A.reshape(-1, ch).mean(1)
    h = sr // 100; E = np.sqrt((A[:len(A)//h*h].reshape(-1, h) ** 2).mean(1))   # 10 ms RMS
    thr = 0.12 * np.median(E[E > np.percentile(E, 60)])
    def onset(t0, t1):
        i0 = int(max(0, t0) * 100); idx = np.where(E[i0:int(t1 * 100)] > thr)[0]
        return (i0 + idx[0]) / 100 if len(idx) else None
    def offset(t0, t1):          # half threshold so soft s/f/th tails aren't clipped
        i0 = int(t0 * 100); idx = np.where(E[i0:int(t1 * 100)] > 0.5 * thr)[0]
        return (i0 + idx[-1] + 1) / 100 if len(idx) else None
    C = []
    for f in F:
        groups, cur = [], []
        for k in range(f['a'], f['b'] + 1):     # split at fillers and pauses > 0.3 s
            if not W[k]['w'].strip():
                if cur: groups.append(cur); cur = []
                continue
            if cur and W[k]['s'] - W[cur[-1]]['e'] > 0.3: groups.append(cur); cur = []
            cur.append(k)
        if cur: groups.append(cur)
        for g in groups:
            k0, k1 = g[0], g[-1]
            pe = W[k0-1]['e'] if k0 > 0 else 0
            ns = W[k1+1]['s'] if k1 + 1 < len(W) else W[k1]['e'] + 1
            on = onset(max(pe - 0.02, W[k0]['s'] - 0.2), W[k0]['s'] + 0.15) or W[k0]['s']
            of = offset(W[k1]['e'] - 0.15, min(ns + 0.02, W[k1]['e'] + 0.3)) or W[k1]['e']
            st = max(on - a.lead, pe); en = min(of + a.trail, ns)     # never bleed into neighbours
            fi, fo = round(st * a.fps), round(en * a.fps)
            if fo > fi:
                C.append(dict(sec=f['sec'], col=f['col'], fi=fi, fo=fo, text=' '.join(W[k]['w'].strip() for k in g)))
    json.dump(C, open(a.out, 'w'))
    print(len(C), 'clips,', f"{sum(c['fo']-c['fi'] for c in C)/a.fps:.1f}s")

# ---------- xml (FCP7 xmeml for Premiere import) ----------
def cmd_xml(a):
    from xml.sax.saxutils import escape
    from urllib.parse import quote
    C = json.load(open(a.clips)); FPS, DUR = a.fps, a.dur
    path = "file://localhost/" + quote(a.video.replace('\\', '/'), safe='/:')
    fname = re.split(r"[\\/]", a.video)[-1]
    rate = f"<rate><timebase>{FPS}</timebase><ntsc>FALSE</ntsc></rate>"
    tc = lambda f: f"{f//(3600*FPS):02d}:{f//(60*FPS)%60:02d}:{f//FPS%60:02d}:{f%FPS:02d}"
    sc = f"<samplecharacteristics>{rate}<width>{a.w}</width><height>{a.h}</height><anamorphic>FALSE</anamorphic><pixelaspectratio>square</pixelaspectratio><fielddominance>none</fielddominance></samplecharacteristics>"
    filedef = (f'<file id="file-1"><name>{escape(fname)}</name><pathurl>{path}</pathurl>{rate}<duration>{DUR}</duration>'
               f'<timecode>{rate}<string>00:00:00:00</string><frame>0</frame><displayformat>NDF</displayformat></timecode>'
               f'<media><video>{sc}</video><audio><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics><channelcount>2</channelcount></audio></media></file>')
    fileref = '<file id="file-1"/>'
    V, Au, M, txt = [], [], [], [a.name, ""]; t = 0; sec = None
    for n, c in enumerate(C, 1):
        fi, fo = c['fi'], c['fo']; d = fo - fi; vid, aid = f"v{n}", f"a{n}"
        if c['sec'] != sec:
            sec = c['sec']; M.append(f"<marker><comment>{c['col']}</comment><name>{escape(sec)}</name><in>{t}</in><out>-1</out></marker>")
            txt.append(f"\n## {sec} [{c['col']}]")
        txt.append(f"{n:3d}  cut {tc(t)}  source {tc(fi)}-{tc(fo)}  {c['text']}")
        links = (f"<link><linkclipref>{vid}</linkclipref><mediatype>video</mediatype><trackindex>1</trackindex><clipindex>{n}</clipindex></link>"
                 f"<link><linkclipref>{aid}</linkclipref><mediatype>audio</mediatype><trackindex>1</trackindex><clipindex>{n}</clipindex><groupindex>1</groupindex></link>")
        common = f"<name>{escape(c['text'][:60])}</name><enabled>TRUE</enabled><duration>{DUR}</duration>{rate}<start>{t}</start><end>{t+d}</end><in>{fi}</in><out>{fo}</out>"
        lab = f"<labels><label2>{c['col']}</label2></labels>"
        V.append(f'<clipitem id="{vid}">{common}{filedef if n == 1 else fileref}<compositemode>normal</compositemode>{links}{lab}</clipitem>')
        Au.append(f'<clipitem id="{aid}">{common}<file id="file-1"/><sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack>{links}{lab}</clipitem>')
        t += d
    seq = (f'<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4"><sequence id="sequence-1"><name>{escape(a.name)}</name><duration>{t}</duration>{rate}'
           f'<media><video><format>{sc}</format><track>{"".join(V)}<enabled>TRUE</enabled><locked>FALSE</locked></track></video>'
           f'<audio><numOutputChannels>2</numOutputChannels><format><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics></format>'
           f'<track>{"".join(Au)}<enabled>TRUE</enabled><locked>FALSE</locked></track></audio></media>'
           f'<timecode>{rate}<string>00:00:00:00</string><frame>0</frame><displayformat>NDF</displayformat></timecode>{"".join(M)}</sequence></xmeml>')
    open(a.out + '.xml', 'w').write(seq); open(a.out + '.txt', 'w').write('\n'.join(txt))
    print('length', tc(t), len(C), 'clips')

# ---------- edl decode ----------
def cmd_edl(a):
    W = json.load(open(a.words)); fps = a.fps
    def sec(s):  # source timecode -> seconds (source clip fps)
        h, m, s_, f = map(int, re.split(r"[:;]", s)); return h*3600 + m*60 + s_ + f/fps
    evs, seen = [], set()
    for l in open(a.edl, errors='ignore'):
        m = re.match(r"\s*(\d{3,6})\s+\S+\s+(\S+)\s+C\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)", l)
        if not m or m[5] in seen: continue          # one event per record timecode (V/AA/NONE lines repeat)
        seen.add(m[5]); evs.append((sec(m[3]), sec(m[4]), m[5]))
    tot = 0
    for s0, s1, rec in evs:
        words = ' '.join(w['w'].strip() for w in W if w['w'].strip() and w['e'] > s0 + 0.04 and w['s'] < s1 - 0.04)
        print(f"rec {rec}  src [{int(s0//60)}:{s0%60:05.2f}-{int(s1//60)}:{s1%60:05.2f}]  {words}")
        tot += s1 - s0
    print(f"\n{len(evs)} events, {tot:.1f}s")

p = argparse.ArgumentParser(); sp = p.add_subparsers(dest='c', required=True)
x = sp.add_parser('words'); x.add_argument('src'); x.add_argument('dst'); x.set_defaults(f=cmd_words)
x = sp.add_parser('find'); x.add_argument('words'); x.add_argument('spec'); x.add_argument('frags'); x.set_defaults(f=cmd_find)
x = sp.add_parser('clips'); [x.add_argument(k) for k in ('words', 'frags', 'wav', 'out')]
x.add_argument('--lead', type=float, default=.02); x.add_argument('--trail', type=float, default=.05); x.add_argument('--fps', type=float, default=30); x.set_defaults(f=cmd_clips)
x = sp.add_parser('xml'); x.add_argument('clips'); x.add_argument('out'); x.add_argument('--video', required=True)
x.add_argument('--fps', type=int, default=30); x.add_argument('--dur', type=int, required=True); x.add_argument('--w', type=int, default=1920); x.add_argument('--h', type=int, default=1080)
x.add_argument('--name', default='Claude cut'); x.set_defaults(f=cmd_xml)
x = sp.add_parser('edl'); x.add_argument('words'); x.add_argument('edl'); x.add_argument('--fps', type=float, default=30); x.set_defaults(f=cmd_edl)
a = p.parse_args(); a.f(a)
```

## 9. Interview tips (if Adam asks what to ask)

- Ask them to **put the question in the answer** ("I started my franchise in…"), so the interviewer can be cut completely.
- Earnings now, best month, and in 12 months / 3 years. Always get a time frame for every number.
- Worries before starting, and how they turned out.
- What the business actually is, in one sentence. How the money flows. Who does the work.
- What would you say to someone on the fence? What should someone do if they're interested?
- The marketing: how fast the first leads came, what it costs, how booked up you are.
- Plenty on support, with a specific story of the franchisors helping.
