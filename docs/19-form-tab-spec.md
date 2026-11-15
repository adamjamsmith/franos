# The Form tab: questions, Fit marks and must-haves

**Status:** approved by Adam on 15 November 2026 and built on his computer the same day. See Progress at the end.

> **Brand:** all (first used by Refresh Renovation)
> **Loop step:** avatar
> **Measure it moves:** good-fit share of leads, and good call rate
> **Expected effect:** Adam can change the questions and what counts as a good answer himself, as the data comes in, so the Fit score gets closer to who really signs
> **How we'll know:** the checks at the bottom pass with test leads; after launch, leads with a high Fit score turn into good calls more often than leads with a low one

## Where it is
**Settings > Form**, next to Brand and pages, Calls, Emails and People. Owners only.

The Form tab on each lead stays as it is: that one shows what a person answered.

## What is on the screen
The questions, in the order they appear on the sign-up form. For each question:

- **The question wording.** Can be changed.
- **Move up, move down, remove.**
- **Its answers,** each with:
  - the wording
  - a mark: **Great, OK or Poor**
  - a **Must have** tick
  - how many leads picked it, as a share (for example "31% of 140 leads")
- **Scored or not.** A question can be "for information only", which means it is asked but does not count towards the Fit score. Today the job-role question is like this.

At the bottom: **Add a question**, and **Bin**.

A line at the top says: never ask about age or gender.

## The Fit score
- Great counts 2, OK counts 1, Poor counts 0.
- Every scored question counts the same.
- The Fit score is what they got, as a share of the most they could get, out of 100.
- The board (70 or more) and the "call now" alert work as they do now.

**This changes today's scores a little.** Today the questions carry different weights (25, 25, 25, 15, 10). After this they are equal. Refresh Renovation's current answers are carried over: top points become Great, zero becomes Poor, anything between becomes OK.

## Must-haves
A question can have one or more answers ticked **Must have**. A lead has to pick one of the ticked answers.

A new brand starts with no must-haves. They are added once the data shows what matters.

**When someone misses a must-have:**

| | What happens |
|---|---|
| What they see | A small box: "Thanks for your interest." No thank-you page, no video, no booking |
| Saved | Yes, as a lead marked **Didn't qualify**, with their answers and consent |
| Emails | None, including the prospectus |
| Meta | No Lead event |
| Board | Not on it |
| Leads list | Shown, with a "Didn't qualify" label |
| Numbers | Counted separately, by ad, so it is clear which ads bring them |
| Booking | Cannot book: the booking page treats them as someone who has not signed up |

**When a box is empty or wrong** (no name, bad email, a question not answered): "Please fix this", everything typed is kept, the box goes red. Same as now. The "Thanks for your interest" box only appears when the form is complete and valid.

## When the marks or must-haves change
- **Every lead's Fit score is worked out again** with the new marks, straight away. The board and Numbers always use one set of rules.
- **Nobody changes sides because a must-have changed.** Someone already let in keeps getting their emails. Someone who didn't qualify stays that way, so nobody gets a surprise email weeks later. Must-haves apply to new sign-ups.

## Removing and restoring
- A removed question goes to the **Bin**. It leaves the public form and stops counting towards the Fit score.
- The answers people already gave are kept on their leads.
- **Restore** puts it back on the form, linked to those same answers.
- The same goes for a single answer that leads have already picked: it is binned, not deleted.
- Rewording a question or an answer keeps the link. It is still the same question.

## Not in this step
- How each answer performs (good call rate per answer). That needs real calls first.
- Different weights per question.
- Letting a lead who didn't qualify back in by hand.
- The Interest level on each lead (Cold, Warming, Warm, Hot, shown as a count). Adam is drawing how the lead level should look first.
- New kinds of question (typed answers, tick several). Questions stay as tick-one circles.

## Checks
1. Add a question with three answers; it appears on the public form in the right place.
2. Reword and reorder; the form follows, and old answers still show on leads.
3. Change a mark; an existing lead's Fit score changes, and the board follows.
4. Tick a must-have. A test lead who misses it sees "Thanks for your interest", is saved as Didn't qualify, gets no email, sends no Meta event, is not on the board and cannot book.
5. A test lead who meets it goes to the thank-you page and gets the prospectus email, as now.
6. Leave the name empty: "Please fix this", nothing typed is lost, no "Thanks" box.
7. Remove a question, then restore it; the old answers are back.
8. A lead from before a new must-have keeps getting emails.
9. One brand cannot see or change another brand's form.

## Progress
Built 15 November 2026. Checks 1 to 8 were walked through by hand in a browser on a throwaway database; check 9 rests on the existing brand locks and their tests. 21 automatic tests were added (153 in all).

Three things settled while building:

- **A question a lead was never asked is left out of their Fit score.** Otherwise adding a question would pull every existing lead down and off the board.
- **An answer nobody has picked is deleted, not binned.** The bin only holds what leads have used.
- **A new question stays off the public form until it has two answers with wording,** so a half-written question is never shown to visitors.

Every button on the screen saves what has been typed before doing its own job, so nothing typed is lost.

### Second version, the same day
Adam tried the first screen, found it messy and sent a sketch. The screen was rebuilt to match it:

- One tight table, no explanations. A row per question (number, wording, "Radio button", remove) that opens to show its answers (asterisk, wording, score, remove), with an "Enter answer..." row at the bottom and an "Enter question..." row at the end.
- **The asterisk is the must-have.** Click it and it goes green.
- **Drag to reorder:** a question by its number, an answer by the grip beside its wording. This replaced the up and down buttons.
- **The "counts towards the Fit score" tick is gone.** A question counts only if its answers carry different marks; if they are all the same it is for information only.
- **The share of leads who picked each answer** is no longer on the screen. It shows when the mouse rests on an answer's score.
- **Save is one button, top right.** Changes are held on screen until it is pressed, including anything typed into an "Enter..." row. Leaving the page with unsaved changes asks first.
- The Bin only appears when something is in it.

Tried by hand on a throwaway database: opening and closing, the asterisk, adding, removing to the bin, Save, the public form following, and re-scoring. Dragging was checked through the screen's own drag handling but not with a real mouse, which the automated browser cannot do. 155 automatic tests in all.
