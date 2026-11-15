/**
 * Runs once when the app starts. While franOS runs on this computer, this checks every minute
 * for emails that are due and for timed work such as call reminders. On AWS the same check is triggered by a scheduler instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const holder = globalThis as unknown as { __franosTicker?: NodeJS.Timeout };
  if (holder.__franosTicker) return;
  const { sendDueForAllBrands } = await import("./email/deliver");
  const { runTimedWork } = await import("./calls/run");
  const { sendMetaForAllBrands } = await import("./meta/run");
  holder.__franosTicker = setInterval(() => {
    sendDueForAllBrands().catch((error) => console.error("Email check failed", error));
    runTimedWork().catch((error) => console.error("Timed work failed", error));
    sendMetaForAllBrands().catch((error) => console.error("Meta check failed", error));
  }, 60_000);
}
