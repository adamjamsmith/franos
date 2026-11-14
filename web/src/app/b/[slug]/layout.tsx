import Link from "next/link";
import { signOut } from "@/app/actions";
import { quietButtonClass } from "@/components/ui";
import { requireBrand } from "@/lib/session";

const roleNames = { owner: "Owner", client: "Client", consultant: "Consultant", site: "" } as const;

export default async function BrandLayout({ children, params }: LayoutProps<"/b/[slug]">) {
  const { slug } = await params;
  const { client, user, role } = await requireBrand(slug);
  const groups = [
    {
      label: "Work the leads",
      tabs: [
        { href: `/b/${slug}/board`, label: "Board" },
        { href: `/b/${slug}`, label: "Leads" },
        { href: `/b/${slug}/calls`, label: "Calls" },
      ],
    },
    { label: "How it is going", tabs: [{ href: `/b/${slug}/numbers`, label: "Numbers" }] },
    {
      label: "Set it up",
      tabs: [
        { href: `/b/${slug}/emails`, label: "Emails" },
        { href: `/b/${slug}/settings`, label: "Settings" },
      ],
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-300 pb-4 dark:border-neutral-700">
        <div>
          <p className="text-sm font-semibold tracking-wide text-neutral-500">franOS</p>
          <h1 className="text-2xl font-semibold">{client.name}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <a href={`/site/${slug}`} target="_blank" className={`${quietButtonClass} inline-flex items-center gap-1.5`}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.500 5.600 12 3z" />
            </svg>
            View site
          </a>
          <Link href="/brands" className={quietButtonClass}>
            Switch brand
          </Link>
          <span className="text-neutral-500">
            {user.name} · {roleNames[role]}
          </span>
          <form action={signOut}>
            <button className={quietButtonClass}>Log out</button>
          </form>
        </div>
      </header>
      <nav className="mb-6 flex flex-wrap gap-x-8 gap-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{group.label}</p>
            <div className="flex gap-4 text-sm font-medium">
              {group.tabs.map((tab) => (
                <Link key={tab.href} href={tab.href} className="underline-offset-4 hover:underline">
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      {children}
    </div>
  );
}
