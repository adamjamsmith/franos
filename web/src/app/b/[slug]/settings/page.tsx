import { updateBrand, updateSiteContent } from "@/app/actions";
import { saveFee } from "@/app/b/[slug]/work-actions";
import { buttonClass, Field, inputClass, Notice, quietButtonClass } from "@/components/ui";
import { requireBrand } from "@/lib/session";
import { formFor, siteFor } from "@/site/config";

const typeNames: Record<string, string> = {
  business_builder: "Business builder (management franchise)",
  sole_operator: "Sole operator",
};

export default async function SettingsPage({ params, searchParams }: PageProps<"/b/[slug]/settings">) {
  const { slug } = await params;
  const { saved, problem } = await searchParams;
  const { client, role } = await requireBrand(slug);
  const target = client.targetCostPerSigningPence ? client.targetCostPerSigningPence / 100 : null;
  const site = siteFor(client);
  const form = formFor(client);

  if (role !== "owner") {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold">Settings</h2>
        <dl className="grid grid-cols-[14rem_1fr] gap-y-2 text-sm">
          <dt className="text-neutral-500">Brand</dt>
          <dd>{client.name}</dd>
          <dt className="text-neutral-500">Type of franchise</dt>
          <dd>{typeNames[client.avatarType]}</dd>
          <dt className="text-neutral-500">Target cost per signing</dt>
          <dd>{target ? `£${target.toLocaleString("en-GB")}` : "Not set"}</dd>
          <dt className="text-neutral-500">Website address</dt>
          <dd>{client.domain ?? "Not set"}</dd>
        </dl>
      </section>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      {saved && <Notice kind="ok">Saved.</Notice>}
      {problem === "fee" && <Notice>Enter the franchise fee in pounds, for example 35000.</Notice>}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Brand</h2>
        <form action={updateBrand} className="flex flex-col gap-4">
          <input type="hidden" name="slug" value={slug} />
          <Field label="Brand name">
            <input name="name" required defaultValue={client.name} className={inputClass} />
          </Field>
          <Field label="Type of franchise">
            <select name="avatarType" defaultValue={client.avatarType} className={inputClass}>
              <option value="business_builder">{typeNames.business_builder}</option>
              <option value="sole_operator">{typeNames.sole_operator}</option>
            </select>
          </Field>
          <Field label="Target cost per signed franchisee (£)">
            <input name="targetCost" inputMode="numeric" defaultValue={target ?? ""} className={inputClass} />
          </Field>
          <Field label="Website address (the franchise domain, when you have one)">
            <input name="domain" defaultValue={client.domain ?? ""} className={inputClass} placeholder="example-franchise.co.uk" />
          </Field>
          <button className={`${buttonClass} self-start`}>Save brand</button>
        </form>
      </section>

      <section >
        <h2 className="mb-1 text-lg font-semibold">Franchise fee</h2>
        <p className="mb-3 text-sm text-neutral-500">
          Recorded as the value of a signing when franOS tells Meta someone signed.
        </p>
        <form action={saveFee} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="slug" value={slug} />
          <Field label="Franchise fee (£)">
            <input name="fee" inputMode="decimal" required defaultValue={site.franchiseFee ?? ""} placeholder="35000" className={`${inputClass} w-40`} />
          </Field>
          <button className={quietButtonClass}>Save fee</button>
        </form>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Public pages</h2>
        <p className="mb-3 text-sm text-neutral-500">
          The wording, videos and documents leads see.{" "}
          <a href={`/site/${slug}`} target="_blank" className="underline">
            Open the public page
          </a>
        </p>
        <form action={updateSiteContent} className="flex flex-col gap-4">
          <input type="hidden" name="slug" value={slug} />
          <Field label="Brand colour (for buttons)">
            <input name="primaryColour" type="color" defaultValue={site.primaryColour} className="h-10 w-20" />
          </Field>
          <Field label="Logo image address (leave empty to show the brand name)">
            <input name="logoUrl" defaultValue={site.logoUrl} className={inputClass} />
          </Field>
          <Field label="Headline">
            <input name="headline" required defaultValue={site.headline} className={inputClass} />
          </Field>
          <Field label="Sub-headline">
            <textarea name="subheadline" rows={2} defaultValue={site.subheadline} className={inputClass} />
          </Field>
          <Field label="Requirements (one per line; shown as 'This is for you if')">
            <textarea name="requirements" rows={4} defaultValue={site.requirements.join("\n")} className={inputClass} />
          </Field>
          <Field label="Thank-you heading (use {first_name} for their name)">
            <input name="thankYouHeading" defaultValue={site.thankYouHeading} className={inputClass} />
          </Field>
          <Field label="Thank-you text">
            <textarea name="thankYouText" rows={2} defaultValue={site.thankYouText} className={inputClass} />
          </Field>
          <Field label="Introduction video (VSL) address">
            <input name="vslUrl" defaultValue={site.vslUrl} className={inputClass} />
          </Field>
          <Field label="Testimonial videos (one per line: Title | Person | Video address). Add | no chat to keep someone out of the &quot;Want to talk to this person?&quot; email">
            <textarea
              name="videos"
              rows={4}
              defaultValue={site.videos.map((v) => [v.title, v.person ?? "", v.url, ...(v.offerChat === false ? ["no chat"] : [])].join(" | ")).join("\n")}
              className={inputClass}
            />
          </Field>
          <Field label="Prospectus address (PDF)">
            <input name="doc_prospectus" defaultValue={site.documents.prospectus.url} className={inputClass} />
          </Field>
          <Field label="Next steps address (PDF)">
            <input name="doc_next-steps" defaultValue={site.documents["next-steps"].url} className={inputClass} />
          </Field>
          <Field label="Questions address (PDF)">
            <input name="doc_questions" defaultValue={site.documents.questions.url} className={inputClass} />
          </Field>
          <Field label="Consent wording (next to the tick box; saved with every lead)">
            <textarea name="consentWording" rows={3} required defaultValue={site.consentWording} className={inputClass} />
          </Field>
          <Field label="WhatsApp tick box wording">
            <input name="whatsappWording" defaultValue={site.whatsappWording} className={inputClass} />
          </Field>
          <Field label="Privacy notice">
            <textarea name="privacyText" rows={6} defaultValue={site.privacyText} className={inputClass} />
          </Field>
          <button className={`${buttonClass} self-start`}>Save public pages</button>
        </form>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Form questions and Fit points</h2>
        <p className="mb-3 text-sm text-neutral-500">
          Shown for reference. Changing the questions and points from this screen comes later in Step 1; for now ask
          Claude to change them.
        </p>
        <ul className="flex flex-col gap-3 text-sm">
          {form.questions.map((q) => (
            <li key={q.id}>
              <p className="font-medium">{q.label}</p>
              <p className="text-neutral-500">{q.options.map((o) => `${o.label} (${o.points})`).join(" · ")}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
