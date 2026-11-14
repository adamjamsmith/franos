# Email layouts and the starter library

**Status:** built on Adam's computer on 14 November 2026, after he said yes in chat. No separate spec was written first; this note records what was built and where it came from.

> **Brand:** all (first used by Refresh Renovation)
> **Loop step:** assets and launch
> **Measure it moves:** share of emails opened and clicked, and so the share of leads who reach each step of the path
> **Expected effect:** emails look like the franchise's own, in the layouts already proven on today's franOS, so the copywriter's words drop straight in
> **How we'll know:** each layout previews correctly; after launch, opens and clicks per email are at least what today's franOS gets

## Where it came from
Read from the franOS Developer Manual and the Local Treasures email chain files on Adam's computer (the chain data, the build script and the mock-up of EC-00 to EC-25). GoHighLevel itself was not opened. The look is matched from the mock-up, so small details such as exact spacing may differ from the live templates.

## The five layouts
Chosen per email on the Emails tab.

| Layout | What it is |
|---|---|
| **Header** | The standard styled email |
| **Header + video** | A video thumbnail under the headline, with a "Watch Ali's Full Story" button, linking to that franchisee's video page |
| **Header + owner photo** | A large photo of the franchisee under the headline |
| **No header** | The styled email without the logo bar |
| **Personal** | Plain text as if typed by the consultant: no logo, no boxes, a link in place of a button |

The styled layouts are built from the same parts, in order: logo bar with a next-step button, headline, picture or video, wording (paragraphs and bullet lists), a franchisee's quote, one big next-step button, a P.S., the consultant's signature, the "Have you watched it yet?" box, then the footer with the company's details and the unsubscribe link.

**The call to action follows the lead in every layout.** The header button, the big button and the P.S. point at the one step that lead has not done yet. "Want to talk to this person?" always points at a call.

## What can be set
- **Per email:** name, layout, subject, preview line, headline, picture address, video (from the brand's testimonials), quote and who said it, P.S. on or off, wording.
- **Per brand (Emails tab, Email settings):** the signature (name, phone, email, website) and the video box (picture and line of text).

## The starter library
A new brand starts with named emails, not numbered ones, in the order from the manual's email library plan:

Prospectus (at sign-up), then one a day: VT1 Short, VT2 Short, Funding, Marketing 1, VT3 Short, VT4 Short, VT5 Short, Training, Marketing 2, UC1, Day in the Life, VT1 Long, Support, UC2, Territory, VT2 Long, Marketing 3, UC3, Questions, VT3 Long, Next Steps, UC4, Why Now, Book a Call.

Testimonial emails use Header + video; Funding uses No header; the rest use Header. Reactions and nudges use Personal. All wording is placeholder for the copywriter.

A brand set up earlier has a button on the Emails tab to add whichever starter emails it is missing. Nothing already there is changed.

## Checked
132 automatic tests pass, 8 of them for the layouts. Each layout was looked at in a browser on a throwaway database.

## Not done
- Call emails keep their own simple layout
- The UC (useful content) emails have no video of their own yet: franOS only holds testimonial videos and the introduction video
- A video's thumbnail is typed in on the email; videos do not carry their own thumbnail yet
- Pictures are addresses pasted in, not uploaded: uploading needs the storage that comes with AWS
- The emails have not been tested in real mail apps (Gmail, Outlook, Apple Mail), only in the browser preview. That needs real sending
