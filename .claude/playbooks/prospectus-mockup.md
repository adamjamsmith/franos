
# Prospectus and Next Steps mockups

Turns a client's prospectus and Next Steps PDFs into transparent-background magazine mockups in Adam's style: a tilted closed cover and a tilted open spread, with soft shadows, gutter shading, a paper-edge stack and a light gloss glow. Then it puts them in GHL and links them up. Run it again for every new document version.

## Outputs (per document)

- `<Client> - <Doc> Vx - Mockup Closed.png`: the cover. This is the one franOS uses.
- `<Client> - <Doc> Vx - Mockup Open.png`: the open spread.
- `<Client> - <Doc> Vx - Mockup Both.png`: closed and open side by side, with the pages the same size.

## 1. Find the files

- Request access to `~/Documents/Franchise Right` if it isn't connected.
- The script is `Franchise Right\Tools\prospectus_mockup.py`.
- The PDFs are in `FRClients\<Client>\Design\`. Use the highest `Prospectus Vx.pdf` and `Next Steps Vx.pdf`, not the `(view)` or `source` files.
- Stage the script and the PDFs.

## 2. Pick the pages

Render a contact sheet (`pdftoppm -r 25`) and look at it.

- **Prospectus:** cover = page 1. The open spread is **always the franchisee testimonial or case-study pages** (Local Treasures V1.0: pages 5 and 6, Lou and Sander).
- **Next Steps:** cover = page 1. It has no testimonials, so use the most visual facing pair (Local Treasures V1.0: pages 4 and 5, Preparing for your call and What's covered).
- Tell Adam which pages you used.

## 3. Render

```
pip install --break-system-packages pymupdf numpy pillow
python3 prospectus_mockup.py "<pdf>" --cover 1 --spread <L> <R> --out /mnt/user-data/outputs --width 3000
```

Add `--no-glow` only if Adam asks for no glow.

## 4. Check

Composite each PNG over grey and over a checkerboard, then look at it:

- the background is transparent
- the shadow is soft
- the text is readable
- the gutter and corners have no artefacts

Don't quantise or compress the PNGs: it bands the soft shadow.

## 5. Save locally

Commit the full-size PNGs to `FRClients\<Client>\Design\Mockups\` and send them with SendUserFile.

## 6. Upload to GHL and link

Upload through the client's build script in franOS Sync (Apps Script, adam@franchiseright.co.uk), never through the GHL UI. Local Treasures uses `LT Build.gs`: `LT_MOCKUPS`, `ltMockups_`, task `mockups`.

1. **Make web copies** at these widths: Closed 900, Open 1600, Both 2000. They should each be under 2 MB.
2. **Put them on Drive.** Upload each to Drive with the Drive connector (file reference), then share it "anyone with the link". Note each file ID.
3. **Point the script at them.** Put the IDs in the client's `*_MOCKUPS` list with these names: `Prospectus Vx Mockup Closed/Open/Both` and `Next Steps Vx Mockup Closed/Open/Both`, with folder `Prospectus` / `Next Steps`. The Closed entries carry `cv: 'S-Prospectus'` / `cv: 'S-NextSteps'`.
4. **Run it.** It finds or creates Media Storage › Assets › Prospectus / Next Steps, uploads anything that isn't already there, and points `S-Prospectus` and `S-NextSteps` at the closed mockups.
   - Those slots are portrait single-document images (template 350×420), shown in the Content Manager on Design tab B29 and B30.
   - The Run dropdown often won't select in the built-in browser. Set `LT_TASK` to the task, save, run `ltRun`, then put `LT_TASK` back to whatever it was (other sessions use it).
   - The built-in browser's Google account for franOS is `/u/1/` (adam@franchiseright.co.uk).
5. **Pull.** In the client's Content Manager sheet, run **franOS › Pull from GHL**. If the menus are collapsed into "…", widen the viewport first. Then check B29 and B30 show the mockup names.
6. **Verify.** Fetch both `files.leadconnectorhq.com` URLs and check they return 200, an `image/png`, and an RGBA image with a transparent corner.

## Notes

- If the script is missing from Tools, rebuild it with the same outputs, then save it back to Tools.
- Saving and running scripts in franOS Sync is fine, but read the live file first: other sessions add tasks there.
