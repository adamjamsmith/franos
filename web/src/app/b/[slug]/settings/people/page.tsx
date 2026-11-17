import { eq } from "drizzle-orm";
import { addPerson, removePerson } from "@/app/actions";
import { buttonClass, Field, inputClass, Notice, quietButtonClass } from "@/components/ui";
import { withSession } from "@/db/context";
import { memberships, users } from "@/db/schema";
import { calendarStates } from "@/calendars/calendars";
import { adminDb } from "@/db";
import { requireBrand } from "@/lib/session";
import { MyCalendar } from "./my-calendar";

const roleNames: Record<string, string> = { client: "Client", consultant: "Consultant" };

export default async function PeoplePage({ params, searchParams }: PageProps<"/b/[slug]/settings/people">) {
  const { slug } = await params;
  const { error, added, calendar } = await searchParams;
  const { session, db, role, client } = await requireBrand(slug);
  const canManage = role !== "consultant";

  const people = await withSession(db, session, (tx) =>
    tx
      .select({ userId: users.id, name: users.name, email: users.email, role: memberships.role })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.clientId, client.id)),
  );

  // Whether each person has linked a calendar. Only a yes or no leaves the calendar store.
  const calendars = await calendarStates(await adminDb(), [session.userId, ...people.map((p) => p.userId)]);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold">People</h2>
        <p className="text-sm text-neutral-500">
          Who can log in to {client.name}. A Client sees all of this brand&apos;s data. A Consultant works the leads.
        </p>
      </div>
      {added && <Notice kind="ok">Added. They can now log in with their email address.</Notice>}
      {people.length === 0 ? (
        <p className="text-sm text-neutral-500">Nobody has been added yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {people.map((person) => (
            <li
              key={person.userId}
              className="flex items-center justify-between rounded-md border border-neutral-300 px-4 py-3 dark:border-neutral-700"
            >
              <div>
                <p className="font-medium">{person.name}</p>
                <p className="text-sm text-neutral-500">
                  {person.email} · {roleNames[person.role] ?? person.role}
                  {person.role === "consultant" && (calendars.get(person.userId)?.linked ? " · calendar linked" : " · calendar not linked")}
                </p>
              </div>
              {canManage && (
                <form action={removePerson}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="userId" value={person.userId} />
                  <button className={quietButtonClass}>Remove</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <MyCalendar slug={slug} state={calendars.get(session.userId) ?? { linked: false }} result={typeof calendar === "string" ? calendar : undefined} />

      {canManage && (
        <div className="rounded-md border border-neutral-300 p-4 dark:border-neutral-700">
          <h3 className="mb-3 font-semibold">Add a person</h3>
          {error === "details" && <Notice>Enter a name and a valid email address.</Notice>}
          {error === "exists" && <Notice>That person already has access to this brand.</Notice>}
          <form action={addPerson} className="mt-3 flex flex-col gap-4">
            <input type="hidden" name="slug" value={slug} />
            <Field label="Name">
              <input name="name" required className={inputClass} />
            </Field>
            <Field label="Email address">
              <input name="email" type="email" required className={inputClass} />
            </Field>
            <Field label="Role">
              <select name="role" className={inputClass} defaultValue="consultant">
                <option value="consultant">Consultant (works the leads, takes the calls)</option>
                <option value="client">Client (owns the brand, sees everything)</option>
              </select>
            </Field>
            <button className={`${buttonClass} self-start`}>Add person</button>
          </form>
        </div>
      )}
    </section>
  );
}
