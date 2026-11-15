import Link from "next/link";
import type { ReactNode } from "react";

/** A box over the page. Clicking outside it, or the cross, goes to `closeHref`: the same page without the box. */
export function Popup({ closeHref, children, narrow = false }: { closeHref: string; children: ReactNode; narrow?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black/50 p-3 sm:p-6">
      <Link href={closeHref} scroll={false} aria-label="Close" className="fixed inset-0 cursor-default" />
      <div className={`relative mx-auto w-full rounded-xl bg-white p-5 shadow-xl sm:p-6 dark:bg-neutral-950 ${narrow ? "mt-[8vh] max-w-2xl" : "max-w-3xl"}`}>
        <Link
          href={closeHref}
          scroll={false}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-2xl leading-none text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          ×
        </Link>
        {children}
      </div>
    </div>
  );
}
