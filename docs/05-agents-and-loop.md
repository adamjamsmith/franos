# Agents and the weekly loop

## Every agent reads first
1. `docs/01-charter.md` (north star)
2. Adam's Hormozi doc (method)
3. The brand's `avatar-card.md` (brand truth)

## The loop, per brand
| Stage | What happens | Who | Adam |
|---|---|---|---|
| 0. Onboard | Settings, consultant, domain, calendar, phone, target cost, avatar type | Client manager | |
| 1. Avatar card | Interviews → qualifiers (3–5), anti-avatar, triggers, motivations, objections, path. Drives form questions, Fit score and content | Insights analyst | **Approves** |
| 2. Assets | Testimonials and VSL (avatar moments), prospectus, next steps, questions, emails, ads, landing pages | Video editor, Copywriter, Designer → review gate | **Approves** |
| 3. Launch | franOS set up, test leads end to end, Meta events checked | Client manager, Tester | **Approves go-live** |
| 4. Run | Automatic: Fit, path engine, emails, speed-to-lead, calls, transcripts, Meta events | franOS itself | |
| 5. Learn (weekly) | Report vs target; what predicts good calls; path use; objections; A/B scoreboard → ranked tasks | Insights analyst → Strategist | **Approves the plan** |

Stage 5 feeds back into stages 1 and 2 (avatar v2, tighter form, new content).

## The agents (about 12)
| Layer | Agent | Job | Uses |
|---|---|---|---|
| Direction | **Strategist** | Owns the Charter and brand targets; turns the weekly report into a ranked task list with five-line justifications; pushes back on work that doesn't move a measure | Charter, reports |
| Direction | **Insights analyst** | Builds and updates avatar cards; finds the path; writes the weekly report; A/B scoreboard | franOS data, transcripts |
| Running | **Orchestrator** | Hands tasks to teams in order, tracks client status, makes sure gates are passed | `CLAUDE.md` |
| Build | **Planner** | Plain-English spec and task list; GHL feature checklist; raises crossroads to Adam | Decisions log |
| Build | **Builder** | Writes the code, area by area | franOS developer manual (new) |
| Build | **Tester** | Automatic tests, incl. a full fake lead journey and client-isolation tests; launch test leads | |
| Build | **Reviewer** | Code quality + security/privacy (can one client see another's leads?) | |
| Content | **Copywriter** | Prospectus, emails, ads, pages | franchise-copywriter |
| Content | **Designer** | Prospectus and page design, mockups | franchise-prospectus-designer, prospectus-mockup |
| Content | **Video editor** | Testimonial cuts, VSL, finishing, B-roll, story episodes | the five video skills |
| Launch | **Client manager** | Onboards brands, runs the launch checklist, keeps `status.md` | franchise-onboarder |
| Review gate | **Fact and compliance checker** | Every figure traced to a source; earnings/funding wording; advertising rules; unsubscribe; GDPR wording | Doc 07 |
| Review gate | **Avatar and voice reviewer** | Does it speak to the avatar card's qualifiers? Adam's standards, Unasked Questions method, real quotes only | Avatar card, copywriter skill |

Releases are an automatic script, not an agent. Reviewers and simple checks can run on cheaper models; writing and building use the strongest model.

## The review gate
Every output passes the gate. A failure goes **back to the team with the reason** (up to two rounds), then to Adam. Adam only sees work that has already passed.

## Example: "Write Refresh's emails"
1. Orchestrator checks status: prospectus signed off → emails next
2. Copywriter writes from interviews, prospectus and the avatar card
3. Gate: fact checker flags an unsourced figure → back → fixed → passes
4. Adam reviews on the franOS preview page and approves
5. Builder/publisher loads them into franOS through the connector
6. Tester sends to test leads; checks links, merge fields, tracking
7. Orchestrator updates `status.md`

## Two kinds of AI
- **Inside franOS (runs all the time):** transcript extraction, Fit score, next missing piece, speed-to-lead alerts. Part of the software, using the Claude API.
- **Claude Code agents (work on franOS and clients):** everything in the table above.

## Scheduled work
- franOS runs timed things itself (email waits, reminders, send times).
- The weekly report runs on a schedule (e.g. Friday) and lands with the Strategist, then Adam.
