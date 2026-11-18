
# Franchise Onboarder

This is the manager playbook for onboarding a new Franchise Right client. It doesn't hold the know-how itself. At each step it opens the playbook that does the work and follows it. Adam is the expert, so keep everything short: no explanations of how to do his parts, just what's done, what's missing and what's next.

## Client folder

`C:\Users\Adam Smith\Documents\Franchise Right\FRClients\<Brand>\`

| Folder | What goes in it |
| --- | --- |
| Dump | Everything the client sends: assets, brain dump, numbers, B-roll |
| Videos | One folder per interview, recording and transcript together, plus Premiere projects |
| Design | Claude's work: copy, prospectus drafts (V0.01, V0.02...), Next Steps, emails |
| Ready | Signed-off V1.0 files and the review pack |

Interview folders in Videos are named:
- `Franchisor - data`
- `Franchisor - recorded`
- `<Franchisee name>`, one each

If the folder doesn't exist yet, create it with these four folders. The Dump folder gets a short "What to ask the client for" list: logo and colours, photos (franchisees with vans, in action, before and afters, branding, head office, products), B-roll, brain dump, numbers, franchisee list, and the call contact's name, headshot, phone and booking link.

## The sequence

1. **Dump**: assets, brain dump, and B-roll if they have it.
2. **Franchisor interview (data)**: the facts and numbers.
3. **Franchisee interviews**: testimonials. Claude cuts each one with `franchise-testimonial-cutter`. Adam finishes them in Premiere and mocks them up into ads.
4. **Franchisor recorded interview**: the narrative, for the VSL, call booked video and trailer. Adam forms the narrative between steps 3 and 4.
5. **Build**: one go, once everything is collected.
   - Copy: `franchise-copywriter`
   - Prospectus: `franchise-prospectus-designer`, using its narrative
   - Next Steps PDF and Google Doc, plus the prepared questions doc (`google-workspace`)
   - Emails and ads copy
   - VSL cut: `franchise-vsl-cutter`
   - B-roll: `broll-cataloguer`, only if they sent B-roll
6. **Review pack**: all the V1.0s in one zip in Ready, with the emails designed, so the client sees everything at once. Send it for sign-off.
7. **After sign-off**: ads uploaded, then the CRM push with `franos-crm-development`. Parked for now; only do this when Adam asks.
8. **Launch review**: once the ads, pages, emails and franOS are live and tested, Adam walks the client through it all on a call. Then:
   - Build the Launch Review pack with `franchise-prospectus-designer` (section 13). It's a zip of numbered PDFs: the Launch Review deck, the 3 email PDFs (Email Chain, Call to Action, Call Booked), the Prospectus, Next Steps, Prepared Questions, and Pages and Links. Save the zip to Ready.
   - Draft Adam's short covering email to the client team, with the pack attached.
9. **Go-live checks** before the ads switch on:
   - Remove the Meta test event code.
   - Check every page footer shows this brand (template copy can carry another client's name).
   - Sending domain and reply-to are set up.
   - Test a booking and a reschedule end to end.
   - Delete the test contacts.

Versions: drafts are V0.01 onwards. The client gets V1.0. Updates are V1.1 to V1.9, then V2.0.

## "Where am I?" / "What's next?"

Don't keep a tick list. The folders are the status. List the client folder recursively and work it out:

| Step | Done when |
| --- | --- |
| 1 | Dump has client files (not just the request list) |
| 2 | `Videos/Franchisor - data` has a recording or transcript |
| 3 | Videos has a folder per franchisee with a recording or transcript; cut lists or XMLs exist for each |
| 4 | `Videos/Franchisor - recorded` has a recording or transcript |
| 5 | Design has the prospectus, Next Steps, questions doc link, emails and ads copy; the VSL cut exists |
| 6 | Ready has the V1.0 files and the review pack zip |
| 7 | Adam says it's signed off and the CRM push is done |
| 8 | Ready has the Launch Review pack zip and the covering email has been sent |
| 9 | Adam says the go-live checks are done and the ads are on |

For step 1, also check the dump against the request list and name anything missing.

Reply in this format, nothing more:

> **<Brand>: step N**
> Done: ...
> Missing: ...
> Next: ...

If the next step is Claude's, offer to start it. If it's Adam's (interviews, Premiere), just name it.

## Rules

- Never edit Dump or Videos. Write Claude's output into Design, and only signed-off versions into Ready.
- Check franchisee name spellings and territories against memory before writing them.
- Every open question goes in one list at the end of step 5, with page numbers, for Adam to send to the client.
