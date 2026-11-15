import { createSign, generateKeyPairSync } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { type Db, withSession } from "../src/db/context";
import { leadEvents, leads } from "../src/db/schema";
import { placeholderEmails } from "../src/email/defaults";
import { blockAddress, mailProblems } from "../src/email/problems";
import { addStarterEmails, nextEmailForLead, type Outgoing, sendDueEmails } from "../src/email/send";
import { genuineSns, type SnsMessage, textToSign } from "../src/email/sns";
import { siteSession } from "../src/site/leads";
import { type Admin, freshDb, seedTwoBrands } from "./helpers";

const bounce = (type: string, ...emails: string[]) =>
  JSON.stringify({
    notificationType: "Bounce",
    bounce: { bounceType: type, timestamp: "2026-12-17T10:00:00.000Z", bouncedRecipients: emails.map((emailAddress) => ({ emailAddress })) },
  });
const complaint = (...emails: string[]) =>
  JSON.stringify({
    eventType: "Complaint",
    complaint: { timestamp: "2026-12-17T11:00:00.000Z", complainedRecipients: emails.map((emailAddress) => ({ emailAddress })) },
  });

describe("what Amazon reports about an email", () => {
  it("stops an address that bounced for good", () => {
    expect(mailProblems(bounce("Permanent", " Sarah@Example.Test "))).toEqual([{ email: "sarah@example.test", reason: "bounce", at: new Date("2026-12-17T10:00:00Z") }]);
  });

  it("leaves a temporary bounce alone", () => {
    expect(mailProblems(bounce("Transient", "sarah@example.test"))).toEqual([]);
  });

  it("stops someone who pressed spam", () => {
    expect(mailProblems(complaint("sarah@example.test", "paul@example.test")).map((p) => `${p.reason} ${p.email}`)).toEqual(["complaint sarah@example.test", "complaint paul@example.test"]);
  });

  it("ignores a delivery report and anything it cannot read", () => {
    expect(mailProblems(JSON.stringify({ notificationType: "Delivery" }))).toEqual([]);
    expect(mailProblems("not json")).toEqual([]);
    expect(mailProblems("null")).toEqual([]);
  });
});

describe("checking a message is really from Amazon", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const certificate = async () => publicKey.export({ type: "spki", format: "pem" }).toString();
  const topic = "arn:aws:sns:eu-north-1:000000000000:franos-email";
  const signed = (over: SnsMessage = {}, version = "1"): SnsMessage => {
    const message: SnsMessage = {
      Type: "Notification",
      MessageId: "m-1",
      TopicArn: topic,
      Message: bounce("Permanent", "sarah@example.test"),
      Timestamp: "2026-12-17T10:00:01.000Z",
      SignatureVersion: version,
      SigningCertURL: "https://sns.eu-north-1.amazonaws.com/SimpleNotificationService-abc.pem",
      ...over,
    };
    const signer = createSign(version === "1" ? "RSA-SHA1" : "RSA-SHA256");
    signer.update(textToSign(message), "utf8");
    return { ...message, Signature: signer.sign(privateKey, "base64") };
  };

  it("accepts a message Amazon signed for our topic, in either signature version", async () => {
    expect(await genuineSns(signed(), topic, certificate)).toBe(true);
    expect(await genuineSns(signed({}, "2"), topic, certificate)).toBe(true);
    expect(await genuineSns(signed({ Type: "SubscriptionConfirmation", Token: "t", SubscribeURL: "https://sns.eu-north-1.amazonaws.com/?Action=ConfirmSubscription" }), topic, certificate)).toBe(true);
  });

  it("refuses a message that was changed after signing", async () => {
    expect(await genuineSns({ ...signed(), Message: bounce("Permanent", "someone-else@example.test") }, topic, certificate)).toBe(false);
  });

  it("refuses another topic, and no topic at all", async () => {
    expect(await genuineSns(signed({ TopicArn: "arn:aws:sns:eu-north-1:999999999999:other" }), topic, certificate)).toBe(false);
    expect(await genuineSns(signed(), "", certificate)).toBe(false);
  });

  it("refuses a certificate that is not on Amazon's own address", async () => {
    for (const SigningCertURL of ["https://evil.example/cert.pem", "http://sns.eu-north-1.amazonaws.com/cert.pem", "https://sns.eu-north-1.amazonaws.com.evil.example/cert.pem", "https://sns.eu-north-1.amazonaws.com/cert.txt"]) {
      expect(await genuineSns(signed({ SigningCertURL }), topic, certificate)).toBe(false);
    }
  });

  it("refuses an unsigned message", async () => {
    expect(await genuineSns({ ...signed(), Signature: undefined }, topic, certificate)).toBe(false);
    expect(await genuineSns({ ...signed(), Signature: "AAAA" }, topic, certificate)).toBe(false);
  });
});

describe("stopping emails to an address", () => {
  let db: Db;
  let admin: Admin;
  let seed: Awaited<ReturnType<typeof seedTwoBrands>>;
  const when = new Date("2026-12-17T10:00:00Z");
  const lead = async (id: string) => (await admin.select().from(leads).where(eq(leads.id, id)))[0];

  beforeEach(async () => {
    const fresh = await freshDb();
    db = fresh.db;
    admin = fresh.admin;
    seed = await seedTwoBrands(admin);
  });

  it("stops the address in every brand that holds it, once, and says so on the lead's record", async () => {
    const [alsoOven] = await admin.insert(leads).values({ clientId: seed.oven.id, email: "Sarah@Example.test", firstName: "Sarah" }).returning();
    expect(await blockAddress(db, { email: "SARAH@example.test", reason: "bounce", at: when })).toBe(2);
    expect(await lead(seed.refreshLead.id)).toMatchObject({ emailBlockedAt: when, emailBlockedReason: "bounce" });
    expect(await lead(alsoOven.id)).toMatchObject({ emailBlockedReason: "bounce" });
    expect((await lead(seed.ovenLead.id)).emailBlockedAt).toBeNull();

    // A later complaint about the same address changes nothing.
    expect(await blockAddress(db, { email: "sarah@example.test", reason: "complaint", at: new Date() })).toBe(0);
    expect((await lead(seed.refreshLead.id)).emailBlockedReason).toBe("bounce");
    const events = await admin.select().from(leadEvents).where(eq(leadEvents.leadId, seed.refreshLead.id));
    expect(events.map((e) => e.type)).toEqual(["email_bounced"]);
  });

  it("does nothing for an address nobody holds", async () => {
    expect(await blockAddress(db, { email: "nobody@example.test", reason: "complaint", at: when })).toBe(0);
  });

  it("sends a stopped lead nothing, and shows nothing as coming next", async () => {
    await withSession(db, { userId: "u_owner", role: "owner", clientId: seed.refresh.id }, (tx) => addStarterEmails(tx, seed.refresh.id, placeholderEmails));
    const outbox: Outgoing[] = [];
    const deliver = (mail: Outgoing) => void outbox.push(mail);
    const now = new Date();
    const next = () => withSession(db, siteSession(seed.refresh.id), (tx) => nextEmailForLead(tx, seed.refresh, seed.refreshLead.id, now));
    expect(await next()).not.toBeNull();

    await blockAddress(db, { email: "sarah@example.test", reason: "complaint", at: now });
    expect((await sendDueEmails(db, seed.refresh, deliver, now)).sent).toBe(0);
    expect(outbox).toHaveLength(0);
    expect(await next()).toBeNull();
  });
});
