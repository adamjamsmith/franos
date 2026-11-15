import { appDb } from "@/db";
import { blockAddress, mailProblems } from "@/email/problems";
import { amazonAddress, genuineSns, type SnsMessage } from "@/email/sns";

/**
 * Where Amazon reports bounces and complaints. Switched off until FRANOS_SES_TOPIC_ARN names our topic;
 * after that, only messages signed by Amazon for that topic are acted on.
 */
export async function POST(request: Request) {
  const topic = process.env.FRANOS_SES_TOPIC_ARN ?? "";
  if (!topic) return new Response("Not found", { status: 404 });

  let message: SnsMessage;
  try {
    message = JSON.parse(await request.text());
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!message || typeof message !== "object" || !(await genuineSns(message, topic))) return new Response("Forbidden", { status: 403 });

  // The first message from Amazon asks us to confirm we want these. Confirming means opening the address it gives.
  if (message.Type === "SubscriptionConfirmation") {
    const confirm = amazonAddress(message.SubscribeURL);
    if (!confirm) return new Response("Forbidden", { status: 403 });
    await fetch(confirm);
    return new Response("Confirmed");
  }

  if (message.Type === "Notification") {
    // Full access, on purpose: see blockAddress.
    const db = await appDb();
    for (const problem of mailProblems(message.Message ?? "")) {
      const stopped = await blockAddress(db, problem);
      console.log(`Email ${problem.reason}: stopped emails to ${stopped} lead${stopped === 1 ? "" : "s"}`);
    }
  }
  return new Response("OK");
}
