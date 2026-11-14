import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createFirstOwner } from "@/app/actions";
import { buttonClass, Card, Field, inputClass, Notice } from "@/components/ui";
import { adminDb } from "@/db";
import { users } from "@/db/schema";

/** First run only. Once an Owner exists this page sends everyone to the login. */
export default async function SetupPage({ searchParams }: PageProps<"/setup">) {
  const db = await adminDb();
  const [{ n }] = await db.select({ n: count() }).from(users);
  if (n > 0) redirect("/login");
  const { error } = await searchParams;

  return (
    <Card title="Set up franOS">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Nobody has an account yet. Create the Owner account. The Owner can see every brand.
      </p>
      {error && <Notice>Enter a name and a valid email address.</Notice>}
      <form action={createFirstOwner} className="flex flex-col gap-4">
        <Field label="Your name">
          <input name="name" required className={inputClass} autoComplete="name" />
        </Field>
        <Field label="Email address">
          <input name="email" type="email" required className={inputClass} autoComplete="email" />
        </Field>
        <button className={buttonClass}>Create Owner account</button>
      </form>
    </Card>
  );
}
