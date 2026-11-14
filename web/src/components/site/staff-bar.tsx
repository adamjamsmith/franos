import { desc, eq } from "drizzle-orm";
import { viewAs } from "@/app/site/[slug]/staff-actions";
import { upcomingCall } from "@/calls/calls";
import { withSession } from "@/db/context";
import { leads } from "@/db/schema";
import { brandAccess } from "@/lib/session";
import { isPreview, knownLeadId } from "@/site/brand";

/**
 * A strip across the top of a brand's public pages, shown only to someone logged in to franOS
 * with access to that brand. It links back to franOS and lets them see the pages as any lead
 * would, or as a brand-new visitor. Real visitors never see it.
 */
export async function StaffBar({ slug }: { slug: string }) {
  const access = await brandAccess(slug);
  if (!access) return null;
  const viewingId = await knownLeadId(slug);
  const preview = await isPreview(slug);
  const now = new Date();

  const recent = await withSession(access.db, access.session, async (tx) => {
    const rows = await tx
      .select({ id: leads.id, firstName: leads.firstName, lastName: leads.lastName, email: leads.email })
      .from(leads)
      .orderBy(desc(leads.createdAt))
      .limit(50);
    const withCalls = [];
    for (const lead of rows) withCalls.push({ ...lead, booked: Boolean(await upcomingCall(tx, lead.id, now)) });
    if (viewingId && !rows.some((l) => l.id === viewingId)) {
      const [extra] = await tx
        .select({ id: leads.id, firstName: leads.firstName, lastName: leads.lastName, email: leads.email })
        .from(leads)
        .where(eq(leads.id, viewingId));
      if (extra) withCalls.unshift({ ...extra, booked: Boolean(await upcomingCall(tx, extra.id, now)) });
    }
    return withCalls;
  });
  const name = (lead: (typeof recent)[number]) => [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email;
  const viewing = recent.find((l) => l.id === viewingId);

  return (
    <div className="border-b border-amber-300 bg-amber-50 text-sm text-amber-950">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <a href={`/b/${slug}`} className="font-semibold underline">
          ← Back to franOS
        </a>
        <form action={viewAs} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="slug" value={slug} />
          <label className="flex items-center gap-2">
            View these pages as
            <select name="leadId" defaultValue={viewing?.id ?? ""} className="max-w-56 rounded-md border border-amber-400 bg-white px-2 py-1 text-sm">
              <option value="">Someone new (not signed up)</option>
              {recent.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {name(lead)}
                  {lead.booked ? " (call booked)" : " (no call booked)"}
                </option>
              ))}
            </select>
          </label>
          <button className="rounded-md border border-amber-500 bg-white px-3 py-1 font-medium hover:bg-amber-100">View</button>
        </form>
        <span className="text-xs">
          {viewing
            ? `Seeing the pages as ${name(viewing)}.${preview ? " Page views are not added to their record, but booking or cancelling a call here is real." : ""}`
            : "Seeing the pages as someone new."}{" "}
          Only you can see this strip.
        </span>
      </div>
    </div>
  );
}
