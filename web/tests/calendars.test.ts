import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { busyFromCalendar, calendarAddress, calendarStates, linkCalendar, refreshCalendars, unlinkCalendar, unseal } from "../src/calendars/calendars";
import { slotsOnOffer } from "../src/calls/calls";
import type { MeetingProvider } from "../src/calls/provider";
import { type Db, withSession } from "../src/db/context";
import { userCalendars } from "../src/db/schema";
import { addSession, bookSession, sessionConsentWording, sessionSlots } from "../src/sessions/sessions";
import { siteSession } from "../src/site/leads";
import { type Admin, freshDb, seedTwoBrands } from "./helpers";

let db: Db;
let admin: Admin;
let seed: Awaited<ReturnType<typeof seedTwoBrands>>;

// Monday 2 March 2026, 8:00am UK time (winter, so UK time = UTC).
const now = new Date("2026-03-02T08:00:00Z");
const at = (iso: string) => new Date(iso);
const wed9 = at("2026-03-04T09:00:00Z");
const address = "https://calendar.example.com/private-abc123/basic.ics";

const event = (lines: string[]) => ["BEGIN:VEVENT", "DTSTAMP:20260201T000000Z", ...lines, "END:VEVENT"];
const calendar = (...events: string[][]) => ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//test//EN", ...events.flat(), "END:VCALENDAR"].join("\r\n");
const dentist = event(["UID:dentist", "SUMMARY:Dentist", "DTSTART:20260304T090000Z", "DTEND:20260304T100000Z"]);
const weekly = event(["UID:weekly", "SUMMARY:Team call", "DTSTART;TZID=Europe/London:20260205T100000", "DTEND;TZID=Europe/London:20260205T110000", "RRULE:FREQ=WEEKLY"]);
const free = event(["UID:free", "SUMMARY:Reminder", "DTSTART:20260304T130000Z", "DTEND:20260304T140000Z", "TRANSP:TRANSPARENT"]);
const cancelled = event(["UID:cancelled", "SUMMARY:Off", "DTSTART:20260304T150000Z", "DTEND:20260304T160000Z", "STATUS:CANCELLED"]);
const mine = calendar(dentist, weekly, free, cancelled);
const gives = (text: string) => async () => text;

const provider: MeetingProvider = {
  waitsForCalls: true,
  create: async () => ({ id: "m1", joinUrl: "https://zoom.example/m1" }),
  move: async () => {},
  cancel: async () => {},
  report: async () => null,
  dropVideo: async () => 0,
  dropRecording: async () => {},
};
const deps = { deliver: () => {}, provider, hosts: [{ name: "Adam", email: "owner@example.test" }] };
const sessionTimes = async () =>
  (await withSession(db, siteSession(seed.refresh.id), (tx) => sessionSlots(tx, seed.refresh, now, "testimonial"))).flatMap((d) => d.slots.map((s) => s.toISOString()));
const callTimes = async (brand: typeof seed.refresh) =>
  (await withSession(db, siteSession(brand.id), (tx) => slotsOnOffer(tx, brand, now))).flatMap((d) => d.slots.map((s) => s.toISOString()));

beforeEach(async () => {
  const fresh = await freshDb();
  db = fresh.db;
  admin = fresh.admin;
  seed = await seedTwoBrands(admin);
});

describe("reading a calendar", () => {
  it("keeps the busy times, lays out repeating appointments, and leaves out free and cancelled ones", () => {
    const busy = busyFromCalendar(mine, now, at("2026-03-16T00:00:00Z"))!.map((b) => `${b.startsAt.toISOString()} to ${b.endsAt.toISOString()}`);
    expect(busy).toEqual([
      "2026-03-04T09:00:00.000Z to 2026-03-04T10:00:00.000Z",
      "2026-03-05T10:00:00.000Z to 2026-03-05T11:00:00.000Z",
      "2026-03-12T10:00:00.000Z to 2026-03-12T11:00:00.000Z",
    ]);
  });

  it("follows the clocks changing: a 10am UK appointment stays at 10am UK in summer", () => {
    const busy = busyFromCalendar(calendar(weekly), at("2026-04-01T00:00:00Z"), at("2026-04-03T00:00:00Z"))!;
    expect(busy.map((b) => b.startsAt.toISOString())).toEqual(["2026-04-02T09:00:00.000Z"]);
  });

  it("says when the text is not a calendar", () => {
    expect(busyFromCalendar("<html>Sign in</html>", now, wed9)).toBeNull();
  });

  it("accepts only a secure address on a named site", () => {
    expect(calendarAddress(" webcal://calendar.example.com/a.ics ")).toBe("https://calendar.example.com/a.ics");
    for (const bad of ["http://calendar.example.com/a.ics", "https://localhost/a.ics", "https://127.0.0.1/a.ics", "https://server/a.ics", "not an address"]) {
      expect(calendarAddress(bad)).toBeNull();
    }
  });
});

describe("linking a calendar", () => {
  it("refuses an address that is wrong, cannot be opened or is not a calendar, and saves nothing", async () => {
    expect(await linkCalendar(admin, "u_owner", "nonsense", now, gives(mine))).toEqual({ ok: false, reason: "address" });
    expect(await linkCalendar(admin, "u_owner", address, now, async () => Promise.reject(new Error("404")))).toEqual({ ok: false, reason: "fetch" });
    expect(await linkCalendar(admin, "u_owner", address, now, gives("<html></html>"))).toEqual({ ok: false, reason: "calendar" });
    expect(await admin.select().from(userCalendars)).toEqual([]);
  });

  it("stores the address sealed, and tells others only whether a calendar is linked", async () => {
    expect((await linkCalendar(admin, "u_owner", address, now, gives(mine))).ok).toBe(true);
    const [row] = await admin.select().from(userCalendars);
    expect(row.feed).not.toContain("calendar.example.com");
    expect(unseal(row.feed)).toBe(address);
    const states = await calendarStates(admin, ["u_owner", "u_mike"]);
    expect(states.get("u_owner")?.linked).toBe(true);
    expect(states.has("u_mike")).toBe(false);
    await unlinkCalendar(admin, "u_owner");
    expect(await admin.select().from(userCalendars)).toEqual([]);
  });

  it("is closed to the everyday role: no brand, and no public page, can read anyone's calendar", async () => {
    await linkCalendar(admin, "u_owner", address, now, gives(mine));
    for (const session of [siteSession(seed.refresh.id), { userId: "u_owner", role: "owner" as const, clientId: seed.refresh.id }]) {
      await expect(withSession(db, session, (tx) => tx.select().from(userCalendars))).rejects.toThrow();
    }
  });

  it("reads the calendar again once the last reading is old, and keeps the last busy times when a reading fails", async () => {
    await linkCalendar(admin, "u_owner", address, now, gives(calendar(dentist)));
    const later = (minutes: number) => new Date(now.getTime() + minutes * 60_000);
    expect(await refreshCalendars(admin, later(5), gives(mine))).toBe(0);
    expect(await refreshCalendars(admin, later(11), gives(mine))).toBe(1);
    expect((await calendarStates(admin, ["u_owner"])).get("u_owner")?.busy).toBeGreaterThan(1);
    const before = (await admin.select().from(userCalendars))[0].busy;
    await refreshCalendars(admin, later(30), async () => Promise.reject(new Error("The calendar answered 500")));
    const [row] = await admin.select().from(userCalendars).where(eq(userCalendars.userId, "u_owner"));
    expect(row.busy).toEqual(before);
    expect(row.lastError).toBe("The calendar answered 500");
  });
});

describe("a linked calendar blocks bookings", () => {
  it("stops a booking link offering a time the owner is busy, but the owner can still book it by hand", async () => {
    expect(await sessionTimes()).toContain(wed9.toISOString());
    await linkCalendar(admin, "u_owner", address, now, gives(mine));
    expect(await sessionTimes()).not.toContain(wed9.toISOString());
    const wording = sessionConsentWording("Refresh Renovation", "hello@example.test");
    const viaLink = await bookSession(db, seed.refresh, deps, { kind: "testimonial", firstName: "Ali", lastName: "Khan", email: "ali@example.test", location: "Leeds", consent: true, consentWording: wording, startsAt: wed9, now });
    expect(viaLink).toEqual({ ok: false, reason: "time" });
    const owner = { userId: "u_owner", role: "owner" as const, clientId: seed.refresh.id };
    const byHand = await addSession(db, owner, seed.refresh, deps, { kind: "franchisor", firstName: "Paul", lastName: "English", email: "paul@example.test", startsAt: wed9, now });
    expect(byHand.ok).toBe(true);
  });

  it("checks the calendar of whoever takes the brand's lead calls: its consultant, or the owner when it has none", async () => {
    await linkCalendar(admin, "u_owner", address, now, gives(mine));
    // Refresh has a consultant, Mike, who has not linked a calendar: the owner's diary does not block his calls.
    expect(await callTimes(seed.refresh)).toContain(wed9.toISOString());
    // Oven Rescue has no consultant, so the owner takes its calls and his diary blocks them.
    expect(await callTimes(seed.oven)).not.toContain(wed9.toISOString());

    await linkCalendar(admin, "u_mike", address, now, gives(mine));
    expect(await callTimes(seed.refresh)).not.toContain(wed9.toISOString());
    // Mike's diary has nothing to do with the owner's recording sessions or with another brand.
    await unlinkCalendar(admin, "u_owner");
    expect(await sessionTimes()).toContain(wed9.toISOString());
    expect(await callTimes(seed.oven)).toContain(wed9.toISOString());
  });
});
