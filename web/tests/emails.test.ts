import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { placeholderEmails } from "../src/email/defaults";
import { type Db, withSession } from "../src/db/context";
import { clients, emails, emailSends, leadEvents, leads } from "../src/db/schema";
import { nextStepFor, pathFrom, sign, trackedLink, ukDay, ukTimeOnDay } from "../src/email/render";
import {
  addStarterEmails,
  buildEmail,
  type Outgoing,
  recordClick,
  recordOpen,
  sendDueEmails,
  unsubscribe,
} from "../src/email/send";
import { registerLead, type SignUpInput, siteSession } from "../src/site/leads";
import { recordEvent } from "../src/site/track";
import { type Admin, freshDb, seedTwoBrands } from "./helpers";

let db: Db;
let admin: Admin;
let seed: Awaited<ReturnType<typeof seedTwoBrands>>;
let outbox: Outgoing[];
const deliver = (mail: Outgoing) => void outbox.push(mail);

const answers = { timing: "0-3", role: "senior", experience: "business", money: "yes", team: "team", property: "landlord" };
const signUp = (email: string, firstName = "Dana"): SignUpInput => ({
  firstName,
  lastName: "Test",
  email,
  phone: "07456 100101",
  postcode: "M1 1AA",
  why: "",
  answers,
  consent: true,
  whatsapp: false,
  utm: {},
  honeypot: "",
});

/** A new lead whose sign-up time is fixed, so timing can be tested exactly. */
async function leadAt(email: string, createdAt: Date, brand = seed.refresh) {
  const result = await registerLead(db, brand, signUp(email));
  if (!result.ok) throw new Error("sign-up failed");
  await admin.update(leads).set({ createdAt }).where(eq(leads.id, result.leadId));
  return result.leadId;
}
const owner = (clientId: string) => ({ userId: "u_owner", role: "owner" as const, clientId });
const site = () => siteSession(seed.refresh.id);
const subjects = () => outbox.map((m) => m.subject);

// Monday 2 March 2026, 14:00 UK time (winter, so UK time = UTC).
const signedUp = new Date("2026-03-02T14:00:00Z");
const at = (iso: string) => new Date(iso);

beforeEach(async () => {
  const fresh = await freshDb();
  db = fresh.db;
  admin = fresh.admin;
  seed = await seedTwoBrands(admin);
  outbox = [];
  await withSession(db, owner(seed.refresh.id), (tx) => addStarterEmails(tx, seed.refresh.id, placeholderEmails));
  await withSession(db, owner(seed.oven.id), (tx) => addStarterEmails(tx, seed.oven.id, placeholderEmails));
  // The seeded leads are not part of these tests.
  await admin.update(leads).set({ outcome: "not_interested" });
});

describe("the path and the next step", () => {
  it("moves on as each step is done, in order", () => {
    const events: { type: string; data: unknown }[] = [];
    expect(nextStepFor(pathFrom(events))).toBe("prospectus");
    events.push({ type: "document_open", data: { kind: "prospectus" } });
    expect(nextStepFor(pathFrom(events))).toBe("call");
    events.push({ type: "call_booked", data: {} });
    expect(nextStepFor(pathFrom(events))).toBe("next-steps");
    events.push({ type: "document_download", data: { kind: "next-steps" } });
    expect(nextStepFor(pathFrom(events))).toBe("questions");
    events.push({ type: "document_open", data: { kind: "questions" } });
    expect(nextStepFor(pathFrom(events))).toBe("done");
  });

  it("the next-step button in an email follows the lead's path", async () => {
    const leadId = await leadAt("dana@example.test", signedUp);
    await sendDueEmails(db, seed.refresh, deliver, signedUp);
    expect(outbox[0].html).toContain("Read the prospectus");
    await recordEvent(db, site(), leadId, { type: "document_open", kind: "prospectus" });
    await sendDueEmails(db, seed.refresh, deliver, at("2026-03-03T09:20:00Z"));
    expect(outbox[1].html).toContain("Schedule a call");
    expect(outbox[1].html).not.toContain("Read the prospectus");
  });
});

describe("UK time", () => {
  it("gives 9:20 UK time in winter and in summer, and the UK day", () => {
    expect(ukTimeOnDay(at("2026-03-02T14:00:00Z"), 1, "09:20").toISOString()).toBe("2026-03-03T09:20:00.000Z");
    expect(ukTimeOnDay(at("2026-07-01T14:00:00Z"), 1, "09:20").toISOString()).toBe("2026-07-02T08:20:00.000Z");
    expect(ukDay(at("2026-07-01T23:30:00Z"))).toBe("2026-07-02");
  });
});

describe("sending", () => {
  it("sends the prospectus email at once, with the lead's name, and only once", async () => {
    await leadAt("dana@example.test", signedUp);
    expect(await sendDueEmails(db, seed.refresh, deliver, signedUp)).toEqual({ sent: 1, held: 0 });
    expect(await sendDueEmails(db, seed.refresh, deliver, signedUp)).toEqual({ sent: 0, held: 0 });
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ to: "dana@example.test", subject: "Your prospectus, Dana" });
    expect(outbox[0].html).toContain("Hi Dana,");
    expect(outbox[0].headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("sends one email a day at most: the sequence in order, with a nudge taking a day when the lead is stuck", async () => {
    await leadAt("dana@example.test", signedUp);
    const run = (iso: string) => sendDueEmails(db, seed.refresh, deliver, at(iso));
    await run("2026-03-02T14:00:00Z"); // prospectus
    await run("2026-03-03T09:19:00Z"); // a minute early: nothing
    expect(subjects()).toEqual(["Your prospectus, Dana"]);
    await run("2026-03-03T09:20:00Z"); // day 1
    await run("2026-03-03T15:00:00Z"); // same day: nothing more
    // Then once every morning for the next two and a half weeks. This lead never opens the prospectus.
    for (let day = 4; day <= 20; day++) await run(`2026-03-${String(day).padStart(2, "0")}T09:20:00Z`);
    expect(subjects()).toEqual([
      "Your prospectus, Dana", // 2 March
      "Placeholder email 1", // 3 March, day 1
      "Placeholder email 2", // 4 March
      "Did you get the prospectus, Dana?", // 5 March: 3 days stuck, so the nudge takes the day
      "Placeholder email 3", // 6 March, a day late
      "Placeholder email 4", // 7 March: one a day
      "Placeholder email 5", // 8 March
      "Your Refresh Renovation prospectus", // 12 March: the second and last nudge, 7 days after the first
    ]);
  });

  it("after a gap, catches up one email per day, not all at once", async () => {
    await leadAt("dana@example.test", signedUp);
    await sendDueEmails(db, seed.refresh, deliver, at("2026-03-12T10:00:00Z"));
    expect(subjects()).toEqual(["Your prospectus, Dana"]);
    await sendDueEmails(db, seed.refresh, deliver, at("2026-03-13T10:00:00Z"));
    await sendDueEmails(db, seed.refresh, deliver, at("2026-03-14T10:00:00Z"));
    expect(subjects()).toEqual(["Your prospectus, Dana", "Did you get the prospectus, Dana?", "Placeholder email 1"]);
  });

  it("stops for a lead who unsubscribes, and puts it on their timeline", async () => {
    const leadId = await leadAt("dana@example.test", signedUp);
    await sendDueEmails(db, seed.refresh, deliver, signedUp);
    expect(await unsubscribe(db, site(), leadId, "wrong-signature")).toBe(false);
    expect(await unsubscribe(db, site(), leadId, sign(`unsubscribe|${leadId}`))).toBe(true);
    await sendDueEmails(db, seed.refresh, deliver, at("2026-03-10T09:20:00Z"));
    expect(outbox).toHaveLength(1);
    const events = await admin.select().from(leadEvents).where(eq(leadEvents.leadId, leadId));
    expect(events.map((e) => e.type)).toContain("unsubscribed");
  });

  it("stops for a lead marked signed or not interested", async () => {
    const leadId = await leadAt("dana@example.test", signedUp);
    await sendDueEmails(db, seed.refresh, deliver, signedUp);
    await admin.update(leads).set({ outcome: "signed" }).where(eq(leads.id, leadId));
    await sendDueEmails(db, seed.refresh, deliver, at("2026-03-10T09:20:00Z"));
    expect(outbox).toHaveLength(1);
  });

  it("holds sequence emails over the daily limit until the next day, but never the prospectus email", async () => {
    await admin.update(clients).set({ site: { email: { dailyLimit: 2 } } }).where(eq(clients.id, seed.refresh.id));
    const [brand] = await admin.select().from(clients).where(eq(clients.id, seed.refresh.id));
    for (const n of [1, 2, 3]) await leadAt(`lead${n}@example.test`, signedUp);
    expect(await sendDueEmails(db, brand, deliver, signedUp)).toEqual({ sent: 3, held: 0 }); // three prospectus emails
    expect(await sendDueEmails(db, brand, deliver, at("2026-03-03T09:20:00Z"))).toEqual({ sent: 2, held: 1 });
    expect(await sendDueEmails(db, brand, deliver, at("2026-03-03T16:00:00Z"))).toEqual({ sent: 0, held: 1 });
    // Next day: the held lead gets email 1, and one of the others gets email 2, then the limit is reached again.
    expect(await sendDueEmails(db, brand, deliver, at("2026-03-04T09:20:00Z"))).toMatchObject({ sent: 2 });
    expect(subjects().filter((s) => s === "Placeholder email 1")).toHaveLength(3);
  });

  it("an email that is turned off is not sent to leads who have not had it", async () => {
    await leadAt("dana@example.test", signedUp);
    await sendDueEmails(db, seed.refresh, deliver, signedUp);
    await withSession(db, owner(seed.refresh.id), (tx) => tx.update(emails).set({ active: false }).where(eq(emails.key, "seq-01")));
    // The sequence is one a day in order, so the next email simply takes the place of the one switched off.
    await sendDueEmails(db, seed.refresh, deliver, at("2026-03-03T09:20:00Z"));
    expect(subjects()).toEqual(["Your prospectus, Dana", "Placeholder email 2"]);
    await sendDueEmails(db, seed.refresh, deliver, at("2026-03-04T09:20:00Z"));
    expect(subjects()[2]).toBe("Placeholder email 3");
    expect(subjects()).not.toContain("Placeholder email 1");
  });

  it("what the preview builds is exactly what gets sent", async () => {
    const leadId = await leadAt("dana@example.test", signedUp);
    await sendDueEmails(db, seed.refresh, deliver, signedUp);
    const [send] = await admin.select().from(emailSends).where(eq(emailSends.leadId, leadId));
    const [email] = await admin.select().from(emails).where(eq(emails.id, send.emailId));
    const preview = await withSession(db, owner(seed.refresh.id), (tx) =>
      buildEmail(tx, seed.refresh, email, { id: leadId, firstName: "Dana" }, send.id),
    );
    // The preview is built after the send, when "email_sent" is on the timeline; the path is unchanged.
    expect(preview.html).toBe(outbox[0].html);
    expect(preview.subject).toBe(outbox[0].subject);
  });
});

describe("links, opens and brands", () => {
  it("a click is recorded on the right lead and leads to the page", async () => {
    const leadId = await leadAt("dana@example.test", signedUp);
    await sendDueEmails(db, seed.refresh, deliver, signedUp);
    const [send] = await admin.select().from(emailSends).where(eq(emailSends.leadId, leadId));
    const to = "/site/refresh-renovation/prospectus";
    const result = await recordClick(db, site(), "refresh-renovation", send.id, to, sign(`${send.id}|${to}`));
    expect(result).toEqual({ leadId, to });
    const [after] = await admin.select().from(emailSends).where(eq(emailSends.id, send.id));
    expect(after.clicks).toBe(1);
    expect(after.firstClickedAt).not.toBeNull();
    const events = await admin.select().from(leadEvents).where(eq(leadEvents.leadId, leadId));
    expect(events.at(-1)).toMatchObject({ type: "email_click", data: { emailKey: "prospectus", to: "/prospectus" } });
  });

  it("a link cannot be altered to go somewhere else", async () => {
    const leadId = await leadAt("dana@example.test", signedUp);
    await sendDueEmails(db, seed.refresh, deliver, signedUp);
    const [send] = await admin.select().from(emailSends).where(eq(emailSends.leadId, leadId));
    const good = "/site/refresh-renovation/prospectus";
    const signature = sign(`${send.id}|${good}`);
    for (const bad of ["https://evil.example/", "//evil.example/", "/site/refresh-renovation/../../brands", "/site/oven-rescue/prospectus"]) {
      expect(await recordClick(db, site(), "refresh-renovation", send.id, bad, signature)).toBeNull();
    }
    const evil = "https://evil.example/";
    expect(await recordClick(db, site(), "refresh-renovation", send.id, evil, sign(`${send.id}|${evil}`))).toBeNull();
  });

  it("links in the email all go through franOS and point at this brand's pages", async () => {
    await leadAt("dana@example.test", signedUp);
    await sendDueEmails(db, seed.refresh, deliver, signedUp);
    const hrefs = [...outbox[0].html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
    expect(hrefs.length).toBeGreaterThanOrEqual(3);
    for (const href of hrefs) expect(href).toMatch(/^http:\/\/localhost:3000\/(l|u)\//);
    expect(hrefs[0]).toBe(trackedLink({ baseUrl: "http://localhost:3000", slug: "refresh-renovation", sendId: hrefs[0].split("/l/")[1].split("?")[0] }, "prospectus"));
  });

  it("an open is recorded once", async () => {
    const leadId = await leadAt("dana@example.test", signedUp);
    await sendDueEmails(db, seed.refresh, deliver, signedUp);
    const [send] = await admin.select().from(emailSends).where(eq(emailSends.leadId, leadId));
    expect(await recordOpen(db, site(), send.id, "bad")).toBe(false);
    await recordOpen(db, site(), send.id, sign(`open|${send.id}`));
    await recordOpen(db, site(), send.id, sign(`open|${send.id}`));
    const events = await admin.select().from(leadEvents).where(eq(leadEvents.leadId, leadId));
    expect(events.filter((e) => e.type === "email_open")).toHaveLength(1);
  });

  it("one brand's emails, sends and unsubscribes are invisible to another brand", async () => {
    const leadId = await leadAt("dana@example.test", signedUp);
    await sendDueEmails(db, seed.refresh, deliver, signedUp);
    const other = siteSession(seed.oven.id);
    expect(await withSession(db, other, (tx) => tx.select().from(emailSends))).toEqual([]);
    const theirEmails = await withSession(db, other, (tx) => tx.select().from(emails));
    expect(theirEmails.every((e) => e.clientId === seed.oven.id)).toBe(true);
    const [send] = await admin.select().from(emailSends).where(eq(emailSends.leadId, leadId));
    expect(await recordOpen(db, other, send.id, sign(`open|${send.id}`))).toBe(true);
    expect((await admin.select().from(emailSends).where(eq(emailSends.id, send.id)))[0].openedAt).toBeNull();
    expect(await unsubscribe(db, other, leadId, sign(`unsubscribe|${leadId}`))).toBe(false);
    // Oven Rescue's run sends nothing to Refresh Renovation's lead.
    outbox = [];
    await sendDueEmails(db, seed.oven, deliver, at("2026-03-10T09:20:00Z"));
    expect(outbox).toEqual([]);
  });

  it("a consultant or client can read emails and stats but cannot change them", async () => {
    for (const role of ["consultant", "client"] as const) {
      const session = { userId: "u_x", role, clientId: seed.refresh.id };
      expect(await withSession(db, session, (tx) => tx.select().from(emails))).toHaveLength(12);
      expect(await withSession(db, session, (tx) => tx.update(emails).set({ subject: "Changed" }).returning())).toEqual([]);
      await expect(
        withSession(db, session, (tx) =>
          tx.insert(emails).values({ clientId: seed.refresh.id, key: "x", kind: "sequence", subject: "x", body: "x" }),
        ),
      ).rejects.toThrow();
    }
  });
});
