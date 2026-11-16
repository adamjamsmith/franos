# Phase 0 spec: foundations

> **History.** This spec records how this part was agreed and built, including things later changed. For how franOS works now, read `00-how-franos-works.md`.

**Status:** approved by Adam on 14 November 2026. Being built on Adam's computer first, with no accounts or domain; AWS and Neon follow.

> **Brand:** all (first used by Refresh Renovation)
> **Loop step:** launch
> **Measure it moves:** none directly. Every later step depends on it
> **Expected effect:** a safe, tested base, so Steps 1–4 can be built quickly before 16 December
> **How we'll know:** the checks at the bottom all pass

## What you will be able to do when it's done
1. Open a private web address and log in as **Owner**, with a two-step code.
2. Create a client (Refresh Renovation) and fill in its settings: name, colours, logo, consultant, target cost per signing, avatar type.
3. Invite Paul as **Client** and Mike as **Consultant**. Each sees only Refresh Renovation.
4. See an empty leads list, ready for Step 1.
5. **Switch between brands.** As Owner you see a list of every franchise opportunity and pick one; everything on screen changes to that brand. A consultant who works for two brands gets the same switcher, limited to those two. Adding a new brand is a form, not a rebuild.

There is nothing public yet. No pages, forms or emails.

## What gets set up behind it
| Piece | Plain English |
|---|---|
| **Code store** | A private GitHub repository. Every change is saved with its history |
| **Two copies** | A **test** copy for building and trying things, and a **live** copy. Nothing reaches live without your OK |
| **The app** | Next.js, running on AWS in London, paid per use |
| **The database** | Postgres on Neon in London, with a separate test copy |
| **Where data lives** | Tables for clients, users, leads, events (every timestamped thing a lead does), consent records, timed jobs, and an audit log |
| **Client separation** | Every row is tagged with its client. The app checks it, and the database refuses to hand over another client's rows (the second lock) |
| **Login** | Sign in with Google or Microsoft, or an email link. Two-step code required. Three roles: Owner, Client, Consultant |
| **Timed work** | A jobs table checked every minute. Unused until Step 2, but in place |
| **Safety** | AWS spend cap and bill alerts, daily database backups, error alerts sent to you, secrets kept in AWS's secret store and never in files |

## Technical choices I've made (say if you or Ollie want any changed)
- **TypeScript** throughout
- **SST** to put Next.js on AWS (it writes the AWS setup as code)
- **Drizzle** to talk to the database and manage changes to it
- **Better Auth** for login, roles and the two-step code
- **Vitest and Playwright** for automatic tests

## Not in this step
Pages, forms, emails, booking, Zoom, Meta, scoring. Those are Steps 1–4.

## Checks before it counts as done
- [ ] An Owner with two brands can switch between them, and each view shows only that brand's data
- [ ] Owner, Client and Consultant can each log in, with the two-step code
- [ ] A Consultant for client A cannot see client B's data, tested through the app and directly against the database
- [ ] A Consultant cannot export or delete; the attempt appears in the audit log
- [ ] A timed job set for "one minute from now" runs once, on time
- [ ] The test copy and live copy are fully separate
- [ ] A backup can be restored
- [ ] No secret appears anywhere in the code store
- [ ] A spend alert reaches Adam's email

## Progress
**14 Nov 2026 — database and timed jobs built on Adam's computer (in `web/`).** 25 automatic tests pass (`npm test` in `web/`).

Proven so far, at the database level:
- One brand cannot see, change, or attach data to another brand's leads, people or jobs
- The owner sees every brand, and only the selected brand's data
- A consultant cannot delete leads; history and the audit log cannot be edited
- A due job runs once, on time; failures retry and then stop with the error kept

**14 Nov 2026 (later) — login and brand screens built.** 27 automatic tests pass. Walked through in a browser with test accounts, from a clean start:
- First-run Owner setup, login by emailed 6-digit code, authenticator-app setup, backup codes, second-step code on later logins
- A session that has not passed the second step opens nothing
- Owner: add a brand, switch brands, change settings, add and remove people
- Consultant: sees only their own brand; another brand's address gives "not found"; no add-brand, add-person or save-settings controls

**Changed from the spec:** login uses a 6-digit code sent by email (no passwords). "Sign in with Google or Microsoft" needs a real web address, so it is added when the app moves to AWS. On this computer no email is sent; codes appear at `/dev/mailbox`.

**To run it on this computer:** in the `web` folder run `npm run dev`, then open http://localhost:3000. The local database is the `web/.data` folder; delete it to start again from nothing.

**Still to do in Phase 0:** AWS and Neon (test and live copies), GitHub, real email for login codes, Google/Microsoft sign-in, backups and restore test, spend alerts, browser tests that run automatically (the browser walk-through was done by hand), export controls (there is no export feature yet), and repeating the "two runners at once" job test on Neon.
