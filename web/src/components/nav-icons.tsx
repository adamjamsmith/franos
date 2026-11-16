import type { ReactNode } from "react";

/** The small line icons used in the left-hand menu. */
export type IconName = "board" | "leads" | "calls" | "sessions" | "numbers" | "emails" | "settings" | "site" | "switch" | "logout";

const shapes: Record<IconName, ReactNode> = {
  board: <path d="M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v11h-4z" />,
  leads: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.500 19c.600-3.400 3.200-5 6.500-5s5.900 1.600 6.500 5M16 4.800a3.500 3.500 0 010 6.400M18 14.300c2 .7 3.200 2.300 3.500 4.700" />
    </>
  ),
  calls: <path d="M5 4h3.500l1.700 4.300-2.200 1.400a11 11 0 005.300 5.300l1.400-2.200 4.300 1.700V18a2 2 0 01-2 2A13 13 0 014 7a2 2 0 011-3z" />,
  sessions: (
    <>
      <rect x="3" y="6.500" width="12.500" height="11" rx="2" />
      <path d="M15.500 10.500l5.500-3v9l-5.500-3" />
    </>
  ),
  numbers: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  emails: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.500 7l8.500 6 8.500-6" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  site: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.500 2.600 3.800 5.600 3.800 9s-1.300 6.400-3.800 9c-2.500-2.600-3.800-5.600-3.800-9S9.500 5.600 12 3z" />
    </>
  ),
  switch: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  logout: <path d="M10 4H6a2 2 0 00-2 2v12a2 2 0 002 2h4M15 8l4 4-4 4M19 12H9" />,
};

export function NavIcon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      {shapes[name]}
    </svg>
  );
}

/** One row of the left-hand menu: an icon, and its name once the screen is wide enough. */
export const navItemClass =
  "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100";
export const navItemActiveClass = "bg-neutral-100 font-medium !text-neutral-900 dark:bg-neutral-900 dark:!text-neutral-100";
export const navLabelClass = "hidden truncate lg:inline";
