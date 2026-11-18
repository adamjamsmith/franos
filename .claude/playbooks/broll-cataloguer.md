
# B-roll cataloguer (v0.1)

Adam (Franchise Right) cuts franchisee testimonial ads in Premiere. This playbook turns a pile of B-roll into a named, searchable library he can drop into Premiere, and keeps a catalogue Claude can use when placing B-roll over a testimonial. Built on Oven Rescue (Nov 2026): 157 cuts from three YouTube brand videos and five phone clips.

Pairs with the franchise-testimonial-cutter playbook (same EDL/XML conventions).

## 1. Inputs

- **Premiere EDL of the B-roll sequence.** Adam runs Scene Edit Detection on the footage, cleans it up, and exports an EDL. Each event = one shot (source file + in/out).
- **The footage folder** on his PC (e.g. `...\Oven Rescue\Videos`). Ask for the folder path and request access to it.
- Or simply a folder of separate clips (then each file = one shot).

## 2. Getting the footage in

- Stage files **one per call** (or a few small ones). Files of 120-170MB each stage fine alone; batches of several large files time out.
- 4K frame grabs are too slow (a 157-cut run timed out at 10 min). First make **480p proxies** with the same frame timing, in the background:
  `ffmpeg -i SRC -map 0:v:0 -vf scale=480:-2 -c:v libx264 -preset ultrafast -g 10 -fps_mode passthrough -an proxy/SRC`
  Run it with nohup and poll; about 45s per 100s of 4K.

## 3. Contact sheets

Run the script in section 9 on the EDL and the proxy folder. It grabs 3 frames per cut (15%, 50%, 85%), 10 cuts per sheet, labelled #001..., plus `cuts.csv` (cut, file, source in/out TC and seconds, timeline in/out). It reads each file's fps with ffprobe, so 25/30/60fps sources all land on the right frames. Read every sheet.

## 4. Catalogue

One row per cut: `cut, name, what is in it, shot (wide/medium/close/macro), category, length, source file, source in/out, timeline in/out`.

- **Name:** `subject_action_detail`, lower case, e.g. `diptank_parts_in`, `oven_fan_dirty_macro`, `van_arrives_street`. Repeats get `_alt`, `_alt2`.
- **Categories (folder map):** 01 Vans, 02 Dip tank (or the brand's core kit), 03 Before (dirty), 04 Strip-down, 05 Cleaning, 06 After (clean, incl. before/after dissolves), 07 Hob and extractor (or secondary services), 08 Kitchen / location, 09 People and visits, 10 Phone footage, 11 Filler. Adapt names per brand.
- **Flag, don't hide:**
  - `remove`: interview/talking-head shots in the B-roll, black frames, unusable phone footage (pointing at the sky, etc.).
  - `duplicate`: the same shot appearing in two source videos (common when brand videos reuse footage). Keep the first, mark the rest.
  - Identifiable customers (faces) need consent; other franchisees' faces must not be used over a different franchisee saying "I/me".
  - Two shots in one clip: note it and split on export.
  - Brand watermark/logo bugs, readable territory names on vans (e.g. "Southampton" on a Derbyshire testimonial), number plates.
- Write the catalogue CSV to the footage folder and save a copy to the claude.ai Project as `claude/<brand>-broll-catalogue.csv` (Oven Rescue's exists in the FranOS project).

## 5. Outputs for Adam

1. **Labelled clip folders (what he asked for most):** export every kept cut as its own file, `NNN_name.mp4`, into the category folders. 1080p H.264, `-preset veryfast -crf 18 -pix_fmt yuv420p -an -movflags +faststart`, cut from the original 4K (`-ss in -i SRC -t dur`). Skip removes and duplicates; split two-shot clips (`153a_`, `153b_`). 143 clips took ~10 min in the background. Zip with `zip -0` and deliver with SendUserFile, then device_commit_files using the fileUuid (committing a large staged zip by path fails). He extracts it as his B-roll bin.
2. **Named XML:** an xmeml sequence rebuilt from the EDL with each clipitem named `NNN_name` and removes labelled red (Rose), so his existing timeline gets labels. Path format `file://localhost/C:/Users/Adam%20Smith/...` (colon unescaped, spaces %20).
3. **Catalogue CSV** (section 4).

## 6. Placing B-roll over a testimonial (DRAFT - not yet good)

Adam rated the first two attempts on David's tight cut "not that good". Treat these as starting rules and learn from his edit: ask for his EDL after he fixes it, decode it, and note what he changed.

What he asked for after v1:
- Use B-roll **more liberally**: about a third or more (v2 was 38%; guides say 30-50% for talking heads).
- **Sections of at least 3 seconds**, no tiny cutaways, no short flashes back to the face between sections (aim for 3s+ of face between sections).
- More at the **start**.
- Use shots to **introduce** things (van arriving before the business, doorbell before repeat customers, kitchen before the job list).

Method that worked technically:
- Rebuild the testimonial's own audio from its EDL and transcribe it with faster-whisper (`small.en`, `word_timestamps=True`) to get word times on the cut's timeline. Change shots on word gaps.
- Build an xmeml with the testimonial on V1/A1 (from the EDL, source at its fps) and B-roll on V2: clipitem rate = sequence rate, in/out in sequence frames, Basic Motion scale to fit (e.g. 33.3333 for 4K on 720p), no B-roll audio, one label colour. Round frames with `round(t*fps+1e-6)` to avoid overlaps.
- Check the first and last frame of every placed shot (from proxies) so no neighbouring shot flashes in.
- Prefer covering the testimonial's jump cuts. Keep the face on the hook, name, the low/emotional story, the big numbers and the close. Never reuse a shot in one video.

Open questions to settle with Adam: how he wants B-roll to enter and leave (hard cut vs J-cut), punch-ins on the face instead of B-roll, music, and whether shots should run longer and slower rather than montage-style.

## 7. Gotchas

- An EDL's source timecodes are at each clip's own fps (60fps phone clips show frames up to :59); the script converts per file.
- Scene detection splits phone clips poorly; whole long phone clips often hold several shots.
- The shell can't reach most websites; footage must come from his folders.

## 8. Interview with Adam before starting

Ask only what you can't see: which folder, which EDL, the brand, and whether anything is off-limits (other brands, territories, customers).

## 9. broll_sheets.py

```python
"""broll_sheets.py EDL MEDIA_FOLDER [--out DIR] [--per-sheet 10] [--width 320]
Contact sheets (3 frames per cut) + cuts.csv from a Premiere B-roll EDL. Needs Pillow + ffmpeg/ffprobe."""
import argparse, csv, json, os, re, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont
EVENT_RE = re.compile(r"^(\d{3,6})\s+\S+\s+\S+\s+\S+\s+(\d\d:\d\d:\d\d[:;]\d\d)\s+(\d\d:\d\d:\d\d[:;]\d\d)\s+(\d\d:\d\d:\d\d[:;]\d\d)\s+(\d\d:\d\d:\d\d[:;]\d\d)")
CLIP_RE = re.compile(r"^\*\s*FROM CLIP NAME:\s*(.+?)\s*$", re.I)
def parse_edl(p):
    ev = []
    for line in open(p, encoding="utf-8", errors="replace"):
        line = line.rstrip("\n"); m = EVENT_RE.match(line)
        if m: ev.append(dict(num=int(m[1]), src_in=m[2], src_out=m[3], rec_in=m[4], rec_out=m[5], clip=None)); continue
        m = CLIP_RE.match(line)
        if m and ev and ev[-1]["clip"] is None: ev[-1]["clip"] = m[1]
    return ev
def index_media(folder):
    out = {}
    for r, _, fs in os.walk(folder):
        for n in fs: out.setdefault(n.lower(), os.path.join(r, n))
    return out
def probe(p):
    d = json.loads(subprocess.run(["ffprobe","-v","error","-select_streams","v:0","-show_entries","stream=r_frame_rate:format=duration:format_tags=timecode:stream_tags=timecode","-of","json",p],capture_output=True,text=True).stdout or "{}")
    s = (d.get("streams") or [{}])[0]; n, _, dd = (s.get("r_frame_rate") or "25/1").partition("/")
    tc = (s.get("tags") or {}).get("timecode") or ((d.get("format") or {}).get("tags") or {}).get("timecode")
    return float(n)/float(dd or 1), float((d.get("format") or {}).get("duration") or 0), tc
def tc_s(tc, fps):
    h, m, s, f = [int(x) for x in re.split(r"[:;]", tc)]; return ((h*3600+m*60+s)*max(1, round(fps))+f)/fps
def grab(p, t, w, tmp, k):
    o = os.path.join(tmp, f"f{k}.png")
    subprocess.run(["ffmpeg","-v","error","-y","-ss",f"{max(t,0):.3f}","-i",p,"-frames:v","1","-vf",f"scale={w}:-2",o],capture_output=True)
    if os.path.exists(o): im = Image.open(o).convert("RGB"); im.load(); os.remove(o); return im
def font(sz):
    for n in ("arialbd.ttf","arial.ttf","DejaVuSans-Bold.ttf","DejaVuSans.ttf"):
        try: return ImageFont.truetype(n, sz)
        except OSError: pass
    return ImageFont.load_default()
def short(n):
    m = re.search(r"Media_([A-Za-z0-9_-]{11})_", n)
    if m: return "YT " + m[1]
    s = os.path.splitext(n)[0]; return s if len(s) <= 24 else s[:22] + ".."
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("edl"); ap.add_argument("media"); ap.add_argument("--out")
    ap.add_argument("--per-sheet", type=int, default=10); ap.add_argument("--width", type=int, default=320); a = ap.parse_args()
    ev = parse_edl(a.edl); media = index_media(a.media)
    out = a.out or os.path.join(os.path.dirname(os.path.abspath(a.edl)), "broll_sheets"); os.makedirs(out, exist_ok=True)
    pr, missing, rows = {}, set(), []; W = a.width; H = int(W*9/16); LW = 230; F1, F2 = font(22), font(14)
    with tempfile.TemporaryDirectory() as tmp:
        for e in ev:
            clip = e["clip"] or "?"; p = media.get(clip.lower()); fr = []; si = so = None
            if p:
                pr.setdefault(p, probe(p)); fps, dur, stc = pr[p]; off = tc_s(stc, fps) if stc else 0.0
                si, so = tc_s(e["src_in"], fps), tc_s(e["src_out"], fps)
                if off and si >= off: si, so = si-off, so-off
                L = max(so-si, 0.04)
                for k, q in enumerate((0.15, 0.5, 0.85)):
                    t = si + L*q; t = min(t, max(dur-0.05, 0)) if dur else t; fr.append(grab(p, t, W, tmp, k))
            else: missing.add(clip)
            row = Image.new("RGB", (LW+3*W+24, H+12), (24,24,24)); d = ImageDraw.Draw(row)
            d.text((10,10), f"#{e['num']:03d}", fill=(255,255,255), font=F1)
            if si is not None: d.text((10,44), f"{so-si:.1f}s", fill=(200,200,200), font=F2)
            d.text((10,66), short(clip), fill=(160,160,160), font=F2)
            if not p: d.text((10,88), "FILE NOT FOUND", fill=(255,90,90), font=F2)
            for k in range(3):
                x = LW+6+k*(W+6); im = fr[k] if k < len(fr) else None
                if im: im = im.resize((W, int(im.height*W/im.width))); row.paste(im.crop((0,0,W,min(H,im.height))), (x,6))
                else: d.rectangle([x,6,x+W,6+H], fill=(60,60,60))
            rows.append(row); e["file"] = clip; e["si"] = round(si,3) if si is not None else ""; e["so"] = round(so,3) if so is not None else ""
    for s in range(0, len(rows), a.per_sheet):
        ch = rows[s:s+a.per_sheet]; sh = Image.new("RGB", (ch[0].width, sum(r.height for r in ch)), (24,24,24)); y = 0
        for r in ch: sh.paste(r, (0,y)); y += r.height
        sh.save(os.path.join(out, f"sheet_{ev[s]['num']:03d}-{ev[s+len(ch)-1]['num']:03d}.jpg"), quality=80)
    with open(os.path.join(out, "cuts.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["cut","file","src_in_tc","src_out_tc","src_in_s","src_out_s","rec_in","rec_out"])
        for e in ev: w.writerow([e["num"], e["file"], e["src_in"], e["src_out"], e["si"], e["so"], e["rec_in"], e["rec_out"]])
    print(len(ev), "cuts"); [print("NOT FOUND:", m) for m in sorted(missing)]
if __name__ == "__main__": main()
```
