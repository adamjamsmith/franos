import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { createBrand, signOut } from "@/app/actions";
import { buttonClass, Field, inputClass, Notice, quietButtonClass } from "@/components/ui";
import { appDb } from "@/db";
import { withSession, withUserOnly } from "@/db/context";
import { clients, memberships } from "@/db/schema";
import { requireUser } from "@/lib/session";

/** The brand list. An Owner sees every brand; everyone else sees the brands they have been added to. */
export default async function BrandsPage({ searchParams }: PageProps<"/brands">) {
  const login = await requireUser();
  const { error } = await searchParams;
  const db = await appDb();

  const brands = login.user.isOwner
    ? await withSession(db, { userId: login.user.id, role: "owner", clientId: null }, (tx) =>
        tx.select().from(clients).orderBy(asc(clients.name)),
      )
    : await brandsFor(login.user.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-neutral-500">franOS</p>
          <h1 className="text-2xl font-semibold">Choose a brand</h1>
        </div>
        <form action={signOut} className="flex items-center gap-3 text-sm">
          <span className="text-neutral-500">{login.user.name}</span>
          <button className={quietButtonClass}>Log out</button>
        </form>
      </header>

      {brands.length === 0 && (
        <p className="mb-8 text-sm">
          {login.user.isOwner ? "No brands yet. Add the first one below." : "You have not been added to a brand yet."}
        </p>
      )}
      <ul className="mb-10 flex flex-col gap-2">
        {brands.map((brand) => (
          <li key={brand.id}>
            <Link
              href={`/b/${brand.slug}`}
              className="flex items-center justify-between rounded-md border border-neutral-300 px-4 py-3 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <span className="font-medium">{brand.name}</span>
              <span className="text-sm text-neutral-500">Open</span>
            </Link>
          </li>
        ))}
      </ul>

      {login.user.isOwner && (
        <section className="rounded-md border border-neutral-300 p-4 dark:border-neutral-700">
          <h2 className="mb-3 text-lg font-semibold">Add a brand</h2>
          {error === "name" && <Notice>Give the brand a name.</Notice>}
          {error === "exists" && <Notice>A brand with that name already exists.</Notice>}
          <form action={createBrand} className="mt-3 flex flex-col gap-4">
            <Field label="Brand name">
              <input name="name" required className={inputClass} placeholder="Refresh Renovation" />
            </Field>
            <Field label="Type of franchise">
              <select name="avatarType" className={inputClass} defaultValue="business_builder">
                <option value="business_builder">Business builder (management franchise)</option>
                <option value="sole_operator">Sole operator</option>
              </select>
            </Field>
            <Field label="Target cost per signed franchisee (£)">
              <input name="targetCost" inputMode="numeric" className={inputClass} placeholder="4000" />
            </Field>
            <button className={`${buttonClass} self-start`}>Add brand</button>
          </form>
        </section>
      )}
    </main>
  );
}

/** A non-owner's brands. Each brand row is read from inside that brand, so the locks stay on. */
async function brandsFor(userId: string) {
  const db = await appDb();
  // Reading your own memberships needs no brand; the database only returns rows that belong to you.
  const mine = await withUserOnly(db, userId, (tx) => tx.select().from(memberships).where(eq(memberships.userId, userId)));
  const brands = [];
  for (const m of mine) {
    const [brand] = await withSession(
      db,
      { userId, role: m.role as "client" | "consultant", clientId: m.clientId },
      (tx) => tx.select().from(clients).where(eq(clients.id, m.clientId)),
    );
    if (brand) brands.push(brand);
  }
  return brands.sort((a, b) => a.name.localeCompare(b.name));
}
