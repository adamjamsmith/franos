import { createVerify } from "node:crypto";

/**
 * Amazon tells franOS about bounces and complaints through its notification service (SNS), which posts
 * to a public address. Anyone could post there, so every message is checked against Amazon's own
 * signature before it is believed.
 */
export type SnsMessage = Record<string, string | undefined>;

const AMAZON = /^sns\.[a-z0-9-]+\.amazonaws\.com$/;

/** An https address on Amazon's notification service, or nothing. */
export function amazonAddress(address: string | undefined): URL | null {
  try {
    const url = new URL(address ?? "");
    return url.protocol === "https:" && AMAZON.test(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

/** The exact text Amazon signs, as its documentation lays it out. */
export function textToSign(message: SnsMessage): string {
  const keys =
    message.Type === "Notification"
      ? ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"]
      : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];
  return keys
    .filter((key) => message[key] !== undefined)
    .map((key) => `${key}\n${message[key]}\n`)
    .join("");
}

const certificates = new Map<string, string>();
async function amazonCertificate(address: string): Promise<string> {
  const kept = certificates.get(address);
  if (kept) return kept;
  const answer = await fetch(address);
  if (!answer.ok) throw new Error("Could not fetch the certificate");
  const certificate = await answer.text();
  certificates.set(address, certificate);
  return certificate;
}

/**
 * Is this message really from Amazon, and from our own topic?
 * `certificateFor` exists so the tests can stand in for Amazon.
 */
export async function genuineSns(
  message: SnsMessage,
  topicArn: string,
  certificateFor: (address: string) => Promise<string> = amazonCertificate,
): Promise<boolean> {
  if (!topicArn || message.TopicArn !== topicArn) return false;
  if (!["Notification", "SubscriptionConfirmation", "UnsubscribeConfirmation"].includes(message.Type ?? "")) return false;
  const certificateAddress = amazonAddress(message.SigningCertURL);
  if (!certificateAddress || !certificateAddress.pathname.endsWith(".pem")) return false;
  const method = message.SignatureVersion === "1" ? "RSA-SHA1" : message.SignatureVersion === "2" ? "RSA-SHA256" : null;
  if (!method || !message.Signature) return false;
  try {
    const check = createVerify(method);
    check.update(textToSign(message), "utf8");
    return check.verify(await certificateFor(certificateAddress.href), message.Signature, "base64");
  } catch {
    return false;
  }
}
