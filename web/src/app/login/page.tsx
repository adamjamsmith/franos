import { count } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { checkLoginCode, sendLoginCode } from "@/app/actions";
import { buttonClass, Card, Field, inputClass, Notice } from "@/components/ui";
import { adminDb } from "@/db";
import { users } from "@/db/schema";
import { isDev } from "@/lib/dev-mailbox";
import { currentLogin } from "@/lib/session";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await currentLogin()) redirect("/brands");
  const db = await adminDb();
  const [{ n }] = await db.select({ n: count() }).from(users);
  if (n === 0) redirect("/setup");

  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";
  const error = typeof params.error === "string" ? params.error : "";

  if (!email) {
    return (
      <Card title="Log in">
        {error === "email" && <Notice>Enter a valid email address.</Notice>}
        <form action={sendLoginCode} className="flex flex-col gap-4">
          <Field label="Email address">
            <input name="email" type="email" required autoFocus className={inputClass} autoComplete="email" />
          </Field>
          <button className={buttonClass}>Send me a login code</button>
        </form>
      </Card>
    );
  }

  return (
    <Card title="Enter your login code">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        If <strong>{email}</strong> has an account, a 6-digit code is on its way. It lasts 10 minutes.
      </p>
      {isDev && (
        <Notice kind="ok">
          Running on this computer, so no email is sent. Find the code in the{" "}
          <Link href="/dev/mailbox" className="underline" target="_blank">
            test mailbox
          </Link>
          .
        </Notice>
      )}
      {error === "code" && <Notice>That code is wrong or has expired. Try again, or ask for a new one.</Notice>}
      <form action={checkLoginCode} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={email} />
        <Field label="6-digit code">
          <input
            name="code"
            required
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            className={inputClass}
          />
        </Field>
        <button className={buttonClass}>Continue</button>
      </form>
      <Link href="/login" className="text-sm underline">
        Use a different email address
      </Link>
    </Card>
  );
}
