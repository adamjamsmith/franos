import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "../db/context";
import { leadEvents, leads } from "../db/schema";

export type MailProblem = { email: string; reason: "bounce" | "complaint"; at: Date };

/**
 * Reads what Amazon SES tells us about an email it sent, and returns the addresses we must stop emailing:
 * - a permanent bounce: the address does not exist or refuses our mail
 * - a complaint: the person pressed "spam"
 * A temporary bounce (a full mailbox, a server that is down) is left alone; Amazon tries again by itself.
 */
export function mailProblems(text: string): MailProblem[] {
  let note: Record<string, unknown>;
  try {
    note = JSON.parse(text);
  } catch {
    return [];
  }
  if (!note || typeof note !== "object") return [];
  const kind = String(note.notificationType ?? note.eventType ?? "");
  const when = (value: unknown) => {
    const at = new Date(String(value ?? ""));
    return Number.isNaN(at.getTime()) ? new Date() : at;
  };
  const addresses = (list: unknown) =>
    (Array.isArray(list) ? list : [])
      .map((r) => String((r as { emailAddress?: unknown })?.emailAddress ?? "").trim().toLowerCase())
      .filter((email) => email.includes("@"));

  if (kind === "Bounce") {
    const bounce = (note.bounce ?? {}) as Record<string, unknown>;
    if (bounce.bounceType !== "Permanent") return [];
    return addresses(bounce.bouncedRecipients).map((email) => ({ email, reason: "bounce" as const, at: when(bounce.timestamp) }));
  }
  if (kind === "Complaint") {
    const complaint = (note.complaint ?? {}) as Record<string, unknown>;
    return addresses(complaint.complainedRecipients).map((email) => ({ email, reason: "complaint" as const, at: when(complaint.timestamp) }));
  }
  return [];
}

/**
 * Stops every email to an address, for good, in every brand that holds it. Nothing is sent to it again,
 * call emails included. Returns how many leads were stopped.
 *
 * `db` must be the full-access connection, used without `withSession`: Amazon reports an address, not a brand,
 * and a dead address is dead for every brand. Only the address is matched and only these two columns change.
 */
export async function blockAddress(db: Db, problem: MailProblem): Promise<number> {
  const found = await db
    .select({ id: leads.id, clientId: leads.clientId })
    .from(leads)
    .where(and(eq(sql`lower(${leads.email})`, problem.email.trim().toLowerCase()), isNull(leads.emailBlockedAt)));
  for (const lead of found) {
    await db.update(leads).set({ emailBlockedAt: problem.at, emailBlockedReason: problem.reason }).where(eq(leads.id, lead.id));
    await db.insert(leadEvents).values({
      clientId: lead.clientId,
      leadId: lead.id,
      type: problem.reason === "bounce" ? "email_bounced" : "email_complaint",
      data: {},
      occurredAt: problem.at,
    });
  }
  return found.length;
}
