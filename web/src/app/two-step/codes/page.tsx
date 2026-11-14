import { headers } from "next/headers";
import Link from "next/link";
import { buttonClass, Card } from "@/components/ui";
import { getAuth } from "@/lib/auth";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Shown once, straight after the two-step code is set up. Opening it again makes a fresh set and cancels the old one. */
export default async function BackupCodesPage() {
  await requireUser();
  const auth = await getAuth();
  const { backupCodes } = await auth.api.generateBackupCodes({ body: {}, headers: await headers() });

  return (
    <Card title="Save your backup codes">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        If you lose your phone, one of these gets you in. Each works once. Save them somewhere safe now; they are not
        shown again.
      </p>
      <code className="grid grid-cols-2 gap-1 rounded-md border border-neutral-300 p-3 text-sm dark:border-neutral-700">
        {backupCodes.map((code) => (
          <span key={code}>{code}</span>
        ))}
      </code>
      <Link href="/brands" className={`${buttonClass} text-center`}>
        I&apos;ve saved them
      </Link>
    </Card>
  );
}
