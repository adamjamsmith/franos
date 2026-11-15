import { notFound } from "next/navigation";
import { devMailbox, isDev } from "@/lib/dev-mailbox";

export const dynamic = "force-dynamic";

/** Shows emails franOS would have sent while it runs on this computer. Does not exist once the app is live. */
export default function DevMailboxPage() {
  if (!isDev) notFound();
  const mail = devMailbox();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold">Test mailbox</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Emails franOS would have sent. Newest first. Reload the page to check for new ones. Links in the emails work,
        and reading an email here counts as opening it.
      </p>
      {mail.length === 0 && <p className="text-sm">Nothing yet.</p>}
      <ul className="flex flex-col gap-4">
        {mail.map((m, i) => (
          <li key={i} className="rounded-md border border-neutral-300 p-3 dark:border-neutral-700">
            <p className="text-xs text-neutral-500">
              To {m.to}
              {m.from ? ` · From ${m.from}` : ""} · {m.at.toLocaleString("en-GB")}
            </p>
            <p className="mb-2 text-sm font-medium">{m.subject}</p>
            {m.html ? (
              <iframe
                title={m.subject}
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                srcDoc={m.html}
                className="h-96 w-full rounded-md border border-neutral-200 bg-white"
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm">{m.body}</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
