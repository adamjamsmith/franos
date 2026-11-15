import Link from "next/link";
import { signOut } from "@/app/actions";
import { NavIcon, navItemClass, navLabelClass } from "@/components/nav-icons";
import { type NavItem, SideNav } from "@/components/side-nav";
import { requireBrand } from "@/lib/session";

const roleNames = { owner: "Owner", client: "Client", consultant: "Consultant", site: "" } as const;

/**
 * Every screen for one brand. The menu runs down the left: icons only on a narrow screen,
 * icons with names on a wide one. Work the leads, then how it is going, then setting it up.
 */
export default async function BrandLayout({ children, params }: LayoutProps<"/b/[slug]">) {
  const { slug } = await params;
  const { client, user, role } = await requireBrand(slug);
  const base = `/b/${slug}`;
  const groups: NavItem[][] = [
    [
      { href: `${base}/board`, label: "Board", icon: "board" },
      { href: base, label: "Leads", icon: "leads", also: [`${base}/leads`] },
      { href: `${base}/calls`, label: "Calls", icon: "calls" },
    ],
    [{ href: `${base}/numbers`, label: "Numbers", icon: "numbers" }],
    // Setting things up is the owner's job, so only the owner has it in the menu.
    ...(role === "owner"
      ? [
          [
            { href: `${base}/emails`, label: "Emails", icon: "emails" },
            { href: `${base}/settings`, label: "Settings", icon: "settings" },
          ] satisfies NavItem[],
        ]
      : []),
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-14 shrink-0 flex-col border-r border-neutral-200 px-2 py-4 lg:w-52 dark:border-neutral-800">
        <p className="mb-4 px-2.5 text-sm font-semibold tracking-wide text-neutral-500">
          <span className="lg:hidden">f</span>
          <span className="hidden lg:inline">franOS</span>
        </p>
        <SideNav groups={groups} />
        <div className="mt-auto flex flex-col gap-1 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <a href={`/site/${slug}`} target="_blank" title="View site" className={navItemClass}>
            <NavIcon name="site" />
            <span className={navLabelClass}>View site</span>
          </a>
          <Link href="/brands" title="Switch brand" className={navItemClass}>
            <NavIcon name="switch" />
            <span className={navLabelClass}>Switch brand</span>
          </Link>
          <form action={signOut}>
            <button title="Log out" className={navItemClass}>
              <NavIcon name="logout" />
              <span className={navLabelClass}>Log out</span>
            </button>
          </form>
          <p className="hidden truncate px-2.5 pt-1 text-xs text-neutral-500 lg:block">
            {user.name} · {roleNames[role]}
          </p>
        </div>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-5 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="mb-5 text-xl font-semibold">{client.name}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
