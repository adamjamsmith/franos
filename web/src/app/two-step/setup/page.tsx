import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { checkTwoStepCode, signOut } from "@/app/actions";
import { buttonClass, Card, Field, inputClass, Notice } from "@/components/ui";
import { adminDb } from "@/db";
import { twoFactors } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { currentLogin } from "@/lib/session";

/** First login only: link an authenticator app to the account. */
export default async function TwoStepSetupPage({ searchParams }: PageProps<"/two-step/setup">) {
  const login = await currentLogin();
  if (!login) redirect("/login");
  if (login.user.twoFactorEnabled) redirect("/two-step");
  const { error } = await searchParams;

  const auth = await getAuth();
  const db = await adminDb();
  const requestHeaders = await headers();
  const [started] = await db.select({ id: twoFactors.id }).from(twoFactors).where(eq(twoFactors.userId, login.user.id));

  // Keep the same secret if the page is reloaded or a wrong code is entered, so the app stays linked.
  let totpURI: string;
  if (started) {
    ({ totpURI } = await auth.api.getTOTPURI({ body: {}, headers: requestHeaders }));
  } else {
    const enabled = await auth.api.enableTwoFactor({ body: {}, headers: requestHeaders });
    if (!("totpURI" in enabled)) throw new Error("Authenticator setup is not available");
    ({ totpURI } = enabled);
  }
  const qr = await QRCode.toDataURL(totpURI, { margin: 1, width: 220 });
  const secret = new URL(totpURI).searchParams.get("secret");

  return (
    <Card title="Set up your two-step code">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        franOS holds people&apos;s personal details, so every login needs a second code from an app on your phone.
      </p>
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
        <li>Install an authenticator app (Google Authenticator, Microsoft Authenticator or 1Password).</li>
        <li>In the app, add an account and scan this code.</li>
        <li>Enter the 6-digit code the app shows.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="QR code to scan with your authenticator app" width={220} height={220} className="rounded-md bg-white p-2" />
      <p className="text-xs text-neutral-500">
        Can&apos;t scan? Type this key into the app: <code className="break-all">{secret}</code>
      </p>
      {error && <Notice>That code is not right. Codes change every 30 seconds, so try the current one.</Notice>}
      <form action={checkTwoStepCode} className="flex flex-col gap-4">
        <input type="hidden" name="back" value="setup" />
        <Field label="Code from your app">
          <input name="code" required inputMode="numeric" autoComplete="one-time-code" className={inputClass} />
        </Field>
        <button className={buttonClass}>Finish setup</button>
      </form>
      <form action={signOut}>
        <button className="text-sm underline">Log out</button>
      </form>
    </Card>
  );
}
