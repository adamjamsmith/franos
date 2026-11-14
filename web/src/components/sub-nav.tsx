import Link from "next/link";

/** A row of links for the pages inside one area, such as Settings or Numbers. */
export function SubNav({ items }: { items: { href: string; label: string }[] }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-x-1 gap-y-1 border-b border-neutral-300 text-sm dark:border-neutral-700">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="-mb-px border-b-2 border-transparent px-3 py-2 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
