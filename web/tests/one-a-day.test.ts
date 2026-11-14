import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { placeholderEmails } from "../src/email/defaults";
import { type Db, withSession } from "../src/db/context";
import { clients, emails, emailSends, leadEvents, leads } from "../src/db/schema";
import { ukDay } from "../src/email/render";
import { addStarterEmails, nextEmailForLead, type Outgoing, sendDueEmails, unsubscribe } from "../src/email/send";
import { sign } from "../src/email/render";
import { registerLead, type SignUpInput, siteSession } from "../src/site/leads";
import { type Admin, freshDb, seedTwoBrands } from "./helpers";

let db: Db;
let admin: Admin;
let seed: Awaited<ReturnType<typeof seedTwoBrands>>;
let brand: typeof seed.refresh;
let outbox: (Outgoing & { at: Date })[];
let clock: Date;
const deliver = (mail: Outgoing) => void outbox.push({ ...mail, at: clock });

const answers = { timing: "0-3", role: "senior", experience: "business", money: "yes", team: "team", property: "landlord" };
const signUp = (email: string): SignUpInput => ({
  firstName: "Dana",
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

const at = (iso: string) => new Date(iso);
// Monday 2 March 2026, 2pm UK time (winter, so UK time = UTC).
const signedUp = at("2026-03-02T14:00:00Z");

async function newLead(email = "dana@example.test") {
  const result = await registerLead(db, brand, signUp(email));
  if (!result.ok) throw new Error("sign-up failed");
  await admin.update(leads).set({ createdAt: signedUp }).where(eq(leads.id, result.leadId));
  await run(signedUp.toISOString()); // the prospectus email
  return result.leadId;
}
async function run(iso: string) {
  clock = at(iso);
  return sendDueEmails(db, brand, deliver, clock);
}
/** Runs the check every hour between two moments, as the real system does every minute. */
async function runHourly(fromIso: string, toIso: string) {
  for (let t = at(fromIso).getTime(); t <= at(toIso).getTime(); t += 3_600_000) await run(new Date(t).toISOString());
}
const happened = (leadId: string, iso: string, type: string, data: Record<string, unknown>) =>
  admin.insert(leadEvents).values({ clientId: brand.id, leadId, type, data, occurredAt: at(iso) });
const readProspectus = (leadId: string, iso: string) => happened(leadId, iso, "document_open", { kind: "prospectus" });
const watched = (leadId: string, iso: string, videoId: string, percent: number) =>
  happened(leadId, iso, "video_progress", { videoId, percent, seconds: percent });
const subjects = () => outbox.map((m) => m.subject);
const sentOn = (day: string) => outbox.filter((m) => ukDay(m.at) === day).map((m) => m.subject);

beforeEach(async () => {
  const fresh = await freshDb();
  db = fresh.db;
  admin = fresh.admin;
  seed = await seedTwoBrands(admin);
  // Two testimonials: Ali can be offered for a chat, Trevor cannot.
  const site = {
    videos: [
      { id: "vt1", title: "Ali's story", person: "Ali", url: "/a.mp4" },
      { id: "vt2", title: "Trevor's story", person: "Trevor", url: "/t.mp4", offerChat: false },
    ],
  };
  [brand] = await admin.update(clients).set({ site }).where(eq(clients.id, seed.refresh.id)).returning();
  outbox = [];
  clock = signedUp;
  await withSession(db, { userId: "u_owner", role: "owner", clientId: brand.id }, (tx) => addStarterEmails(tx, brand.id, placeholderEmails));
  await admin.update(leads).set({ outcome: "not_interested" }); // the seeded leads are not part of these tests
});

describe("one email a day", () => {
  it("never sends a lead two emails on the same day, whatever they do", async () => {
    const leadId = await newLead();
    await readProspectus(leadId, "2026-03-03T19:00:00Z");
    await watched(leadId, "2026-03-04T12:00:00Z", "vt1", 80);
    await runHourly("2026-03-02T15:00:00Z", "2026-03-20T23:00:00Z");

    const perDay = new Map<string, number>();
    for (const mail of outbox) perDay.set(ukDay(mail.at), (perDay.get(ukDay(mail.at)) ?? 0) + 1);
    expect(Math.max(...perDay.values())).toBe(1);
    expect(outbox.length).toBeGreaterThan(8); // and plenty still went out
    expect(new Set(subjects()).size).toBe(outbox.length); // and nothing was sent twice
  });

  it("sends nothing between 9pm and 8am, apart from the prospectus email at sign-up", async () => {
    const night = await registerLead(db, brand, signUp("night@example.test"));
    if (night.ok) await admin.update(leads).set({ createdAt: at("2026-03-02T23:30:00Z") }).where(eq(leads.id, night.leadId));
    await run("2026-03-02T23:30:00Z");
    expect(subjects()).toEqual(["Your prospectus, Dana"]); // asked for it at 11:30pm, got it at 11:30pm
    await admin.update(leads).set({ outcome: "not_interested" }); // that lead is done with
    const leadId = await newLead("dana@example.test");
    outbox = [];
    await readProspectus(leadId, "2026-03-03T22:00:00Z");
    await run("2026-03-03T22:30:00Z");
    await run("2026-03-04T07:59:00Z");
    expect(sentOn("2026-03-04")).toEqual([]);
    await run("2026-03-04T08:00:00Z");
    expect(sentOn("2026-03-04")).toHaveLength(1);
  });
});

describe("time of day", () => {
  it("sends an overdue sequence email at the usual send time, not first thing in the morning", async () => {
    await newLead();
    // Nothing ran on Tuesday, so email 1 is overdue by Wednesday morning.
    await run("2026-03-04T08:00:00Z");
    await run("2026-03-04T09:19:00Z");
    expect(sentOn("2026-03-04")).toEqual([]);
    await run("2026-03-04T09:20:00Z");
    expect(sentOn("2026-03-04")).toEqual(["Placeholder email 1"]);
  });
});

describe("reactions", () => {
  it("'What did you make of it?' goes 10 minutes after they read the prospectus, once", async () => {
    const leadId = await newLead();
    await runHourly("2026-03-03T08:00:00Z", "2026-03-08T10:00:00Z"); // emails 1 and 2, the nudge, emails 3, 4 and 5
    outbox = [];
    await readProspectus(leadId, "2026-03-09T12:00:00Z"); // the sequence has finished, so no email is due today
    await run("2026-03-09T12:09:00Z");
    expect(subjects()).toEqual([]);
    await run("2026-03-09T12:10:00Z");
    expect(subjects()).toEqual(["What did you make of it, Dana?"]);
    // Reading it again does not send it again.
    await readProspectus(leadId, "2026-03-10T12:00:00Z");
    await runHourly("2026-03-10T08:00:00Z", "2026-03-11T20:00:00Z");
    expect(subjects().filter((x) => x.startsWith("What did you make"))).toHaveLength(1);
  });

  it("waits for the next morning if they have already had an email that day, and takes that day's place", async () => {
    const leadId = await newLead();
    await run("2026-03-03T09:20:00Z"); // email 1
    await readProspectus(leadId, "2026-03-03T19:00:00Z");
    await run("2026-03-03T19:30:00Z");
    expect(sentOn("2026-03-03")).toEqual(["Placeholder email 1"]);
    await runHourly("2026-03-04T07:00:00Z", "2026-03-04T20:00:00Z");
    expect(sentOn("2026-03-04")).toEqual(["What did you make of it, Dana?"]);
    await runHourly("2026-03-05T07:00:00Z", "2026-03-05T20:00:00Z");
    expect(sentOn("2026-03-05")).toEqual(["Placeholder email 2"]); // the sequence moved back a day
  });

  it("'Want to talk to this person?' goes after half a testimonial, naming them, once", async () => {
    const leadId = await newLead();
    await runHourly("2026-03-03T08:00:00Z", "2026-03-08T10:00:00Z");
    outbox = [];
    await watched(leadId, "2026-03-09T11:00:00Z", "vt1", 40);
    await run("2026-03-09T11:30:00Z");
    expect(subjects()).toEqual([]); // under half: nothing
    await watched(leadId, "2026-03-09T12:00:00Z", "vt1", 60);
    await run("2026-03-09T12:10:00Z");
    expect(subjects()).toEqual(["Want to talk to Ali?"]);
    expect(outbox[0].text).toContain("I saw you watched Ali's story");
    expect(outbox[0].text).toContain("Schedule a call"); // no call booked, so the button pushes one
  });

  it("is not sent for a testimonial that is switched off, or for the introduction video", async () => {
    const leadId = await newLead();
    await runHourly("2026-03-03T08:00:00Z", "2026-03-08T10:00:00Z");
    outbox = [];
    await watched(leadId, "2026-03-09T12:00:00Z", "vt2", 90); // Trevor: not offered for a chat
    await watched(leadId, "2026-03-09T12:05:00Z", "vsl", 90);
    await run("2026-03-09T13:00:00Z");
    expect(subjects()).toEqual([]);
  });

  it("is not sent to a lead who already has a call booked", async () => {
    const leadId = await newLead();
    await runHourly("2026-03-03T08:00:00Z", "2026-03-08T10:00:00Z");
    outbox = [];
    await happened(leadId, "2026-03-09T10:00:00Z", "call_booked", {});
    await readProspectus(leadId, "2026-03-09T12:00:00Z");
    await watched(leadId, "2026-03-09T12:00:00Z", "vt1", 90);
    await run("2026-03-09T13:00:00Z");
    expect(subjects()).toEqual([]);
  });

  it("is dropped if it could not go within two days", async () => {
    const leadId = await newLead();
    await readProspectus(leadId, "2026-03-03T12:00:00Z");
    // Nothing runs for a week (say the system was down). The moment has passed.
    await run("2026-03-10T12:00:00Z");
    expect(subjects()).not.toContain("What did you make of it, Dana?");
  });
});

describe("nudges", () => {
  it("'Shall we have a chat?' goes 3 days after they read the prospectus, once more 7 days later, then stops", async () => {
    const leadId = await newLead();
    await readProspectus(leadId, "2026-03-02T15:00:00Z"); // read it on the day they signed up
    await runHourly("2026-03-03T08:00:00Z", "2026-03-31T20:00:00Z");
    const nudges = outbox.filter((m) => ["Shall we have a chat?", "Quick one, Dana"].includes(m.subject));
    expect(nudges.map((m) => `${ukDay(m.at)} ${m.subject}`)).toEqual(["2026-03-05 Shall we have a chat?", "2026-03-12 Quick one, Dana"]);
    // They read it, so the "did you get the prospectus?" nudges never went.
    expect(subjects().some((x) => x.includes("Did you get the prospectus"))).toBe(false);
  });

  it("is cancelled the moment they do the thing", async () => {
    const leadId = await newLead();
    await readProspectus(leadId, "2026-03-02T15:00:00Z");
    await happened(leadId, "2026-03-04T10:00:00Z", "call_booked", {}); // booked before the nudge was due
    await runHourly("2026-03-03T08:00:00Z", "2026-03-20T20:00:00Z");
    expect(subjects()).not.toContain("Shall we have a chat?");
    expect(subjects()).not.toContain("Quick one, Dana");
  });

  it("can be switched off", async () => {
    await admin.update(emails).set({ active: false }).where(eq(emails.kind, "nudge"));
    await newLead();
    await runHourly("2026-03-03T08:00:00Z", "2026-03-20T20:00:00Z");
    expect(subjects()).toEqual(["Your prospectus, Dana", ...[1, 2, 3, 4, 5].map((n) => `Placeholder email ${n}`)]);
  });
});

describe("what the lead's record shows", () => {
  it("says why each email was sent", async () => {
    const leadId = await newLead();
    await runHourly("2026-03-03T08:00:00Z", "2026-03-05T20:00:00Z");
    const sent = (await admin.select().from(leadEvents).where(eq(leadEvents.leadId, leadId))).filter((e) => e.type === "email_sent");
    expect(sent.map((e) => (e.data as { reason: string }).reason)).toEqual([
      "signed up",
      "next in the sequence",
      "next in the sequence",
      "has not opened the prospectus",
    ]);
  });

  it("says what they will get next, and when", async () => {
    const leadId = await newLead();
    const next = (iso: string) => withSession(db, siteSession(brand.id), (tx) => nextEmailForLead(tx, brand, leadId, at(iso)));
    // Monday afternoon, just signed up: email 1 tomorrow at 9:20.
    expect(await next("2026-03-02T15:00:00Z")).toMatchObject({ subject: "Placeholder email 1", at: at("2026-03-03T09:20:00Z") });
    // They read the prospectus the same evening: the reaction comes first, tomorrow at 8am.
    await readProspectus(leadId, "2026-03-02T19:00:00Z");
    expect(await next("2026-03-02T19:30:00Z")).toMatchObject({ kind: "reaction", reason: "read the prospectus", at: at("2026-03-03T08:00:00Z") });
    // Nothing is coming for someone who has unsubscribed.
    await admin.update(leads).set({ unsubscribedAt: signedUp }).where(eq(leads.id, leadId));
    expect(await next("2026-03-02T19:30:00Z")).toBeNull();
  });

  it("counts an unsubscribe against the last email they were sent", async () => {
    const leadId = await newLead();
    await run("2026-03-03T09:20:00Z");
    await run("2026-03-04T09:20:00Z");
    expect(await unsubscribe(db, siteSession(brand.id), leadId, sign(`unsubscribe|${leadId}`))).toBe(true);
    const rows = await admin
      .select({ subject: emails.subject, unsubscribedAt: emailSends.unsubscribedAt })
      .from(emailSends)
      .innerJoin(emails, eq(emails.id, emailSends.emailId))
      .where(eq(emailSends.leadId, leadId));
    expect(rows.filter((r) => r.unsubscribedAt).map((r) => r.subject)).toEqual(["Placeholder email 2"]);
  });
});
