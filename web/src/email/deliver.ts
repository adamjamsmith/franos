import { asc } from "drizzle-orm";
import { adminDb, appDb } from "../db";
import { clients } from "../db/schema";
import { deliver } from "../lib/dev-mailbox";
import { type Deliver, sendDueEmails } from "./send";

/**
 * Where emails go. On this computer that is the test mailbox; nothing leaves the machine.
 * When the app moves to AWS this is replaced by Amazon SES.
 */
export const mailboxDeliver: Deliver = (mail) =>
  deliver({
    to: mail.to,
    from: `${mail.fromName} <${mail.fromAddress}>`,
    subject: mail.subject,
    body: mail.text,
    html: mail.html,
  });

/** Sends everything that is due, for every brand. Run once a minute. */
export async function sendDueForAllBrands(now: Date = new Date()) {
  const brands = await (await adminDb()).select().from(clients).orderBy(asc(clients.name));
  const db = await appDb();
  let sent = 0;
  for (const brand of brands) {
    try {
      sent += (await sendDueEmails(db, brand, mailboxDeliver, now)).sent;
    } catch (error) {
      console.error(`Email run failed for ${brand.name}`, error);
    }
  }
  return sent;
}
