import { saveEmailSettings } from "@/app/b/[slug]/emails/actions";
import { buttonClass, Field, inputClass, Notice } from "@/components/ui";
import { emailSettingsFor } from "@/email/render";
import { requireBrand } from "@/lib/session";
import { siteFor } from "@/site/config";

/** Who the emails come from, when they go, how many a day, the signature and the video box. */
export default async function EmailSettingsPage({ params, searchParams }: PageProps<"/b/[slug]/settings/emails">) {
  const { slug } = await params;
  const query = await searchParams;
  const { client, role } = await requireBrand(slug);
  const settings = emailSettingsFor(client.name, siteFor(client));
  if (role !== "owner") return <p className="text-sm text-neutral-500">Only the owner can change the email settings.</p>;

  return (
    <div className="flex flex-col gap-6">
      {query.saved && <Notice kind="ok">Saved.</Notice>}
      <section className="max-w-xl">
        <h2 className="mb-3 text-lg font-semibold">Email settings</h2>
        <form action={saveEmailSettings} className="flex flex-col gap-4">
          <input type="hidden" name="slug" value={slug} />
          <Field label="From name">
            <input
              name="fromName"
              defaultValue={settings.fromName}
              className={inputClass}
            />
          </Field>
          <Field label="From address">
            <input
              name="fromAddress"
              type="email"
              defaultValue={settings.fromAddress}
              className={inputClass}
            />
          </Field>
          <Field label="Time of day for sequence and nudge emails (UK time)">
            <input
              name="sendTime"
              type="time"
              defaultValue={settings.sendTime}
              className={`${inputClass} w-36`}
            />
          </Field>
          <Field label="Most emails per day (keep low while a new email domain warms up)">
            <input
              name="dailyLimit"
              type="number"
              min={0}
              defaultValue={settings.dailyLimit}
              className={`${inputClass} w-36`}
            />
          </Field>
          <Field label="Footer (the company's registered name, number and address)">
            <textarea
              name="footer"
              rows={2}
              defaultValue={settings.footer}
              className={inputClass}
            />
          </Field>
          <h3 className="mt-2 font-semibold">Signature</h3>
          <p className="-mt-3 text-sm text-neutral-500">Who signs the emails. Left empty, emails have no signature.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input name="signatureName" defaultValue={settings.signatureName ?? ""} placeholder="Mike Smith" className={inputClass} />
            </Field>
            <Field label="Phone">
              <input name="signaturePhone" defaultValue={settings.signaturePhone ?? ""} className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="signatureEmail" defaultValue={settings.signatureEmail ?? ""} className={inputClass} />
            </Field>
            <Field label="Website">
              <input name="signatureWebsite" defaultValue={settings.signatureWebsite ?? ""} className={inputClass} />
            </Field>
          </div>
          <h3 className="mt-2 font-semibold">&quot;Have you watched it yet?&quot; box</h3>
          <p className="-mt-3 text-sm text-neutral-500">Shown at the bottom of every styled email, linking to the introduction video.</p>
          <Field label="Picture address (a still from the video)">
            <input name="videoBoxImage" defaultValue={settings.videoBoxImage ?? ""} className={inputClass} />
          </Field>
          <Field label="Line under the heading">
            <input name="videoBoxText" defaultValue={settings.videoBoxText ?? ""} placeholder={`How a ${client.name} business works`} className={inputClass} />
          </Field>
          <button className={`${buttonClass} self-start`}>
            Save email settings
          </button>
        </form>
      </section>
    </div>
  );
}
