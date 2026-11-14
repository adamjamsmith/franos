/**
 * Stand-in for email while franOS runs on this computer.
 * Login codes are kept in memory and shown at /dev/mailbox. Nothing is sent anywhere.
 * Replaced by real email (Amazon SES) when the app moves to AWS.
 */
export type DevMail = { to: string; subject: string; body: string; html?: string; from?: string; at: Date };

const holder = globalThis as unknown as { __franosMailbox?: DevMail[] };

export const isDev = process.env.NODE_ENV !== "production";

export function deliver(mail: Omit<DevMail, "at">) {
  if (!isDev) throw new Error("Email sending is not set up yet");
  const box = (holder.__franosMailbox ??= []);
  box.unshift({ ...mail, at: new Date() });
  box.length = Math.min(box.length, 50);
}

export function devMailbox(): DevMail[] {
  return holder.__franosMailbox ?? [];
}
