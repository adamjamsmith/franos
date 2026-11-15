"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type IconName, NavIcon, navItemActiveClass, navItemClass, navLabelClass } from "./nav-icons";

export type NavItem = { href: string; label: string; icon: IconName; /** Other paths that belong to this item. */ also?: string[] };

/** The main menu, down the left-hand side. Each group is separated by a thin line; the current screen is highlighted. */
export function SideNav({ groups }: { groups: NavItem[][] }) {
  const path = usePathname();
  const all = groups.flat();
  // The longest matching link wins, so "Leads" (the brand's home) does not light up on every screen.
  const matches = (item: NavItem) => [item.href, ...(item.also ?? [])].filter((p) => path === p || path.startsWith(`${p}/`));
  const best = all
    .map((item) => ({ item, length: Math.max(0, ...matches(item).map((p) => p.length)) }))
    .sort((a, b) => b.length - a.length)[0];
  const current = best && best.length > 0 ? best.item.href : null;

  return (
    <nav className="flex flex-col gap-1">
      {groups.map((group, index) => (
        <div key={group[0].href} className={`flex flex-col gap-1 ${index > 0 ? "mt-2 border-t border-neutral-200 pt-3 dark:border-neutral-800" : ""}`}>
          {group.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={current === item.href ? "page" : undefined}
              className={`${navItemClass} ${current === item.href ? navItemActiveClass : ""}`}
            >
              <NavIcon name={item.icon} />
              <span className={navLabelClass}>{item.label}</span>
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
