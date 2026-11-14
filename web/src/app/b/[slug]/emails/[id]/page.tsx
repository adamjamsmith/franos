import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass, Field, inputClass, Notice, quietButtonClass } from "@/components/ui";
import { withSession } from "@/db/context";
import { emails, leads } from "@/db/schema";
import { LAYOUTS } from "@/email/render";
import { buildEmail, sampleWords } from "@/email/send";
import { isDev } from "@/lib/dev-mailbox";
import { requireBrand } from "@/lib/session";
import { siteFor } from "@/site/config";
import { saveEmail, sendTest } from "../actions";

const SAMPLE_ID = "00000000-0000-0000-0000-000000000000";

/** One email: its wording and timing, and a preview of exactly what a chosen lead would receive. */
export default async function EmailPage({ params, searchParams }: PageProps<"/b/[slug]/emails/[id]">) {
  const { slug, id } = await params;
  const query = await searchParams;
  const { session, db, client, role } = await requireBrand(slug);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const isOwner = role === "owner";
  const chosen = typeof query.lead === "string" && /^[0-9a-f-]{36}$/i.test(query.lead) ? query.lead : "";

  const data = await withSession(db, session, async (tx) => {
    const [email] = await tx.select().from(emails).where(eq(emails.id, id));
    if (!email) return null;
    const recent = await tx
      .select({ id: leads.id, firstName: leads.firstName, lastName: leads.lastName })
      .from(leads)
      .orderBy(desc(leads.createdAt))
      .limit(50);
    const lead = recent.find((l) => l.id === chosen) ?? { id: SAMPLE_ID, firstName: "Sam", lastName: "(sample)" };
    const sample = sampleWords(siteFor(client), email.trigger);
    const preview = await buildEmail(tx, client, email, lead, SAMPLE_ID, sample.vars, sample.pushCall);
    return { email, recent, lead, preview };
  });
  if (!data) notFound();
  const { email, recent, lead, preview } = data;
  const videos = siteFor(client).videos;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/b/${slug}/emails`} className="text-sm underline">
          Back to emails
        </Link>
        <h2 className="mt-2 text-xl font-semibold">{email.name ?? email.subject}</h2>
        <p className="text-sm text-neutral-500">
          {email.kind === "prospectus"
            ? "Sent at sign-up"
            : email.kind === "sequence"
              ? "Sequence email. The sequence goes one a day, in the order on the Emails tab"
              : email.trigger === "prospectus_read"
                ? "Reaction, sent 10 minutes after they read the prospectus"
                : email.trigger === "testimonial_watched"
                  ? "Reaction, sent 10 minutes after they watch half a testimonial"
                  : email.trigger === "no_prospectus"
                    ? `Nudge, sent ${email.dayOffset} days after sign-up if the prospectus has not been opened`
                    : `Nudge, sent ${email.dayOffset} days after they read the prospectus if no call is booked`}
        </p>
      </div>
      {query.saved && <Notice kind="ok">Saved.</Notice>}
      {query.added && <Notice kind="ok">Added to the end of the sequence, switched off. Write it, then switch it on. Move it earlier with the arrows on the Emails tab.</Notice>}
      {query.tested && <Notice kind="ok">Test sent to the test mailbox.</Notice>}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 font-semibold">Wording</h3>
          {isOwner ? (
            <form action={saveEmail} className="flex flex-col gap-4">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="id" value={email.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name (what it is called on the Emails tab)">
                  <input name="name" defaultValue={email.name ?? ""} className={inputClass} />
                </Field>
                <Field label="Layout">
                  <select name="layout" defaultValue={email.layout} className={inputClass}>
                    {Object.entries(LAYOUTS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Subject">
                <input name="subject" required defaultValue={email.subject} className={inputClass} />
              </Field>
              <Field label="Preview line (shown after the subject in the inbox)">
                <input name="preview" defaultValue={email.preview ?? ""} className={inputClass} />
              </Field>
              <Field label="Headline (the big title at the top; not used by the Personal layout)">
                <input name="headline" defaultValue={email.headline ?? ""} className={inputClass} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Picture address (image, owner photo or video thumbnail)">
                  <input name="imageUrl" defaultValue={email.imageUrl ?? ""} className={inputClass} />
                </Field>
                <Field label="Video (for the Header + video layout)">
                  <select name="videoId" defaultValue={email.videoId ?? ""} className={inputClass}>
                    <option value="">None</option>
                    {videos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title}
                        {v.person ? ` (${v.person})` : ""}
                      </option>
                    ))}
                    {email.videoId && !videos.some((v) => v.id === email.videoId) && (
                      <option value={email.videoId}>{email.videoId} (not added in Settings yet)</option>
                    )}
                  </select>
                </Field>
              </div>
              <Field label="Wording">
                <textarea name="body" rows={14} defaultValue={email.body} className={`${inputClass} font-mono text-sm`} />
              </Field>
              <p className="text-xs text-neutral-500">
                Leave a blank line between paragraphs. {"{first_name}"} becomes the lead&apos;s name and {"{brand}"} the
                brand&apos;s.{email.trigger === "testimonial_watched" ? " {person} and {video_title} become the franchisee and their video." : ""} For a link to one
                of this brand&apos;s pages write [your words](page:prospectus). Pages: prospectus, next-steps,
                questions, thank-you, video/vt1. Start lines with &quot;- &quot; for a bullet list. The next-step button and P.S. are added for you and
                follow each lead.
              </p>
              {email.kind === "nudge" && (
                <Field label="Days stuck on this step">
                  <input name="dayOffset" type="number" min={0} defaultValue={email.dayOffset} className={`${inputClass} w-32`} />
                </Field>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Quote from a franchisee (optional)">
                  <textarea name="quote" rows={2} defaultValue={email.quote ?? ""} className={inputClass} />
                </Field>
                <Field label="Who said it (name and town)">
                  <input name="quoteBy" defaultValue={email.quoteBy ?? ""} className={inputClass} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="showPs" defaultChecked={email.showPs} className="h-5 w-5" />
                Add the P.S. about their next step
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="active" defaultChecked={email.active} className="h-5 w-5" />
                Switched on
              </label>
              <button className={`${buttonClass} self-start`}>Save email</button>
            </form>
          ) : (
            <pre className="whitespace-pre-wrap rounded-md border border-neutral-300 p-3 text-sm dark:border-neutral-700">
              {email.body}
            </pre>
          )}
        </section>

        <section>
          <h3 className="mb-3 font-semibold">Preview</h3>
          <form className="mb-3 flex flex-wrap items-end gap-3">
            <Field label="Show it as this lead would get it">
              <select name="lead" defaultValue={chosen} className={inputClass}>
                <option value="">Sample lead (Sam)</option>
                {recent.map((l) => (
                  <option key={l.id} value={l.id}>
                    {[l.firstName, l.lastName].filter(Boolean).join(" ")}
                  </option>
                ))}
              </select>
            </Field>
            <button className={quietButtonClass}>Show</button>
          </form>
          <p className="mb-2 text-sm">
            <span className="text-neutral-500">Subject:</span> {preview.subject}
          </p>
          <iframe
            title="Email preview"
            sandbox=""
            srcDoc={preview.html}
            className="h-[34rem] w-full rounded-md border border-neutral-300 bg-white"
          />
          {isOwner && isDev && (
            <form action={sendTest} className="mt-3">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="id" value={email.id} />
              <input type="hidden" name="leadId" value={lead.id === SAMPLE_ID ? "" : lead.id} />
              <button className={quietButtonClass}>Send this to the test mailbox</button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
