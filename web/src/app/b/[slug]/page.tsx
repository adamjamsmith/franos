import { desc } from "drizzle-orm";
import Link from "next/link";
import { callSettingsFor } from "@/calls/slots";
import { LeadPanel } from "@/components/lead-panel";
import { Popup } from "@/components/popup";
import { withSession } from "@/db/context";
import { calls, leads } from "@/db/schema";
import { requireBrand } from "@/lib/session";
import { fullFormFor, siteFor } from "@/site/config";
import { placeLead, STAGE_NAMES } from "@/work/stage";

const line = "border-neutral-300 dark:border-neutral-700";
const small = "text-[11px] leading-tight text-neutral-500 dark:text-neutral-400";
const navButton = `rounded-md border px-2.5 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-900 ${line}`;
const chosen = "bg-neutral-900 text-white hover:!bg-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:!bg-white";
const columns = "grid grid-cols-[minmax(0,1.5fr)_7.5rem_2.5rem_minmax(0,1fr)_minmax(0,1.2fr)_4rem] items-baseline gap-x-3 px-3";

/** Letters and digits only, lower case, so "07456 100 101" finds "07456100101" and "o'brien" finds "OBrien". */
const plain = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Everyone who has signed up, or just the good-fit leads with no call yet: the people worth ringing.
 * Clicking a name opens a brief box with where they stand; "View contact" in it opens everything.
 */
export default async function LeadsPage({ params, searchParams }: PageProps<"/b/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const access = await requireBrand(slug);
  const { session, db, client } = access;
  const now = new Date();
  const goodFitFrom = callSettingsFor(siteFor(client)).alertFit;
  const goodFitOnly = query.list === "goodfit";
  const byFit = query.sort === "fit" || goodFitOnly;
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";
  const here = `/b/${slug}?${[goodFitOnly ? "list=goodfit" : "", query.sort === "fit" ? "sort=fit" : "", search ? `q=${encodeURIComponent(search)}` : ""].filter(Boolean).join("&")}`.replace(/\?$/, "");
  const withParam = (param: string) => `${here}${here.includes("?") ? "&" : "?"}${param}`;

  const { allLeads, allCalls } = await withSession(db, session, async (tx) => ({
    allLeads: await tx.select().from(leads).orderBy(desc(leads.createdAt)).limit(2000),
    allCalls: await tx.select().from(calls),
  }));
  const callsOf = new Map<string, typeof allCalls>();
  for (const call of allCalls) callsOf.set(call.leadId, [...(callsOf.get(call.leadId) ?? []), call]);
  const everyone = allLeads.map((lead) => ({ lead, stage: placeLead(lead, callsOf.get(lead.id) ?? [], now, goodFitFrom).stage }));
  // Good fit: scored well, qualified, and no call booked or held yet.
  const goodFit = everyone.filter((row) => row.stage === "goodfit" && row.lead.qualified);
  // Search looks at the name, the email address and the phone number.
  const wanted = plain(search);
  const found = (row: (typeof everyone)[number]) =>
    wanted === "" || [`${row.lead.firstName ?? ""}${row.lead.lastName ?? ""}`, row.lead.email, row.lead.phone ?? ""].some((text) => plain(text).includes(wanted));
  const rows = (goodFitOnly ? goodFit : everyone).filter(found);
  if (byFit) rows.sort((a, b) => (b.lead.fitScore ?? -1) - (a.lead.fitScore ?? -1));

  const timing = fullFormFor(client).questions.find((q) => q.id === "timing");
  const timingLabel = (value: unknown) => timing?.options.find((o) => o.value === value)?.label ?? "—";

  const isId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
  const peekId = isId(query.peek) ? query.peek : null;
  const openId = isId(query.lead) ? query.lead : null;
  const brief = peekId ? await LeadPanel({ slug, leadId: peekId, base: withParam(`peek=${peekId}`), query, access, brief: { viewHref: withParam(`lead=${peekId}`) } }) : null;
  const full = openId ? await LeadPanel({ slug, leadId: openId, base: withParam(`lead=${openId}`), query, access }) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-lg font-semibold">{goodFitOnly ? "Good fit" : "Leads"}</h2>
        <span className="flex">
          <Link href={`/b/${slug}`} scroll={false} aria-current={goodFitOnly ? undefined : "page"} className={`${navButton} rounded-r-none ${goodFitOnly ? "" : chosen}`}>
            All {everyone.length}
          </Link>
          <Link href={`/b/${slug}?list=goodfit`} scroll={false} aria-current={goodFitOnly ? "page" : undefined} className={`${navButton} -ml-px rounded-l-none ${goodFitOnly ? chosen : ""}`}>
            Good fit {goodFit.length}
          </Link>
        </span>
        <form action={`/b/${slug}`} className="ml-auto">
          {goodFitOnly && <input type="hidden" name="list" value="goodfit" />}
          {query.sort === "fit" && <input type="hidden" name="sort" value="fit" />}
          <input
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Search name, email or phone"
            aria-label="Search leads"
            className={`w-56 rounded-md border bg-transparent px-2.5 py-1 text-xs outline-none placeholder:text-neutral-400 focus:border-neutral-900 dark:focus:border-neutral-100 ${line}`}
          />
        </form>
        {!goodFitOnly && (
          <span className="flex">
            <Link href={`/b/${slug}`} scroll={false} className={`${navButton} rounded-r-none ${byFit ? "" : chosen}`}>
              Newest
            </Link>
            <Link href={`/b/${slug}?sort=fit`} scroll={false} className={`${navButton} -ml-px rounded-l-none ${byFit ? chosen : ""}`}>
              Best fit
            </Link>
          </span>
        )}
      </div>

      <div className={`overflow-hidden rounded-md border text-sm ${line}`}>
        <div className={`${columns} border-b py-1.5 ${line} ${small}`}>
          <span>Name</span>
          <span>Phone</span>
          <span>Fit</span>
          <span>Stage</span>
          <span>Wants to start</span>
          <span>Signed up</span>
        </div>
        {rows.length === 0 && <p className={`${small} px-3 py-2`}>{search ? "Nobody matches that search." : goodFitOnly ? "Nobody here." : "No leads yet."}</p>}
        {rows.map(({ lead, stage }) => {
          const answers = lead.answers as Record<string, string>;
          const phoneDigits = (lead.phone ?? "").replace(/[^\d+]/g, "");
          return (
            <div key={lead.id} className={`${columns} border-t py-2 first:border-t-0 hover:bg-neutral-100 dark:hover:bg-neutral-900 ${line}`}>
              <Link href={withParam(`peek=${lead.id}`)} scroll={false} className="truncate font-medium underline-offset-2 hover:underline">
                {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email}
              </Link>
              {phoneDigits ? (
                <a href={`tel:${phoneDigits}`} className="truncate tabular-nums underline-offset-2 hover:underline">
                  {lead.phone}
                </a>
              ) : (
                <span className="text-neutral-500">—</span>
              )}
              <span className="tabular-nums">{lead.fitScore ?? "—"}</span>
              <span className="truncate text-neutral-600 dark:text-neutral-300">{lead.qualified ? STAGE_NAMES[stage] : "Didn't qualify"}</span>
              <span className="truncate text-neutral-600 dark:text-neutral-300">{timingLabel(answers.timing)}</span>
              <span className="text-neutral-600 dark:text-neutral-300">{lead.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
            </div>
          );
        })}
      </div>

      {brief && (
        <Popup closeHref={here} narrow>
          {brief}
        </Popup>
      )}
      {full && <Popup closeHref={here}>{full}</Popup>}
    </div>
  );
}
