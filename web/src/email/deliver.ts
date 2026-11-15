import { asc } from "drizzle-orm";
import { adminDb, appDb } from "../db";
import { clients } from "../db/schema";
import { deliver as toTestMailbox } from "../lib/dev-mailbox";
import { type Deliver, sendDueEmails } from "./send";
import { type Mail, sesCredentialsFromEnv, sesDeliver } from "./ses";

const holder = globalThis as unknown as { __franosSes?: ((mail: Mail) => Promise<void>) | null };

/**
 * Where an email goes.
 * - With Amazon's sending key (on the server): out through Amazon SES, for real.
 * - Without it, on this computer: into the test mailbox at /dev/mailbox. Nothing leaves the machine.
 * - Without it on the server: refused, so a missing key is noticed and nothing is silently lost.
 */
async function sendMail(mail: Mail) {
  if (holder.__franosSes === undefined) {
    const credentials = sesCredentialsFromEnv();
    holder.__franosSes = credentials ? sesDeliver(credentials) : null;
  }
  if (holder.__franosSes) return holder.__franosSes(mail);
  toTestMailbox({ to: mail.to, from: `${mail.fromName} <${mail.fromAddress}>`, subject: mail.subject, body: mail.text, html: mail.html });
}

/** Every email to a lead or to the team goes through here. */
export const deliverMail: Deliver = (mail) => sendMail(mail);

/** franOS's own emails, such as sign-in codes. They come from franOS, not from a brand. */
export function deliverSystemMail(mail: { to: string; subject: string; body: string }) {
  return sendMail({
    to: mail.to,
    fromName: "franOS",
    fromAddress: process.env.FRANOS_SYSTEM_FROM ?? "login@refresh.franchiseright.co.uk",
    subject: mail.subject,
    text: mail.body,
  });
}

/** Sends everything that is due, for every brand. Run once a minute. */
export async function sendDueForAllBrands(now: Date = new Date()) {
  const brands = await (await adminDb()).select().from(clients).orderBy(asc(clients.name));
  const db = await appDb();
  let sent = 0;
  for (const brand of brands) {
    try {
      sent += (await sendDueEmails(db, brand, deliverMail, now)).sent;
    } catch (error) {
      console.error(`Email run failed for ${brand.name}`, error);
    }
  }
  return sent;
}
