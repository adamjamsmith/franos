import { redirect } from "next/navigation";
import { checkTwoStepCode, signOut } from "@/app/actions";
import { buttonClass, Card, Field, inputClass, Notice } from "@/components/ui";
import { currentLogin } from "@/lib/session";

/** Login step 2: the code from the authenticator app. */
export default async function TwoStepPage({ searchParams }: PageProps<"/two-step">) {
  const login = await currentLogin();
  if (!login) redirect("/login");
  if (!login.user.twoFactorEnabled) redirect("/two-step/setup");
  if (login.session.twoStepVerifiedAt) redirect("/brands");
  const { error } = await searchParams;

  return (
    <Card title="Two-step code">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Open your authenticator app and enter the 6-digit code for franOS.
      </p>
      {error && <Notice>That code is not right. Codes change every 30 seconds, so try the current one.</Notice>}
      <form action={checkTwoStepCode} className="flex flex-col gap-4">
        <Field label="Code from your app">
          <input name="code" required autoFocus inputMode="numeric" autoComplete="one-time-code" className={inputClass} />
        </Field>
        <button className={buttonClass}>Log in</button>
      </form>
      <form action={signOut}>
        <button className="text-sm underline">Log out</button>
      </form>
    </Card>
  );
}
