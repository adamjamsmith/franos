import { saveCallSettings } from "@/app/b/[slug]/calls/actions";
import { callSettingsFor } from "@/calls/slots";
import { buttonClass, Field, inputClass, Notice } from "@/components/ui";
import { requireBrand } from "@/lib/session";
import { siteFor } from "@/site/config";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** When calls can be booked, and when the consultant is told about a good-fit lead. */
export default async function CallSettingsPage({ params, searchParams }: PageProps<"/b/[slug]/settings/calls">) {
  const { slug } = await params;
  const query = await searchParams;
  const { client, role } = await requireBrand(slug);
  const settings = callSettingsFor(siteFor(client));
  if (role !== "owner") return <p className="text-sm text-neutral-500">Only the owner can change the call settings.</p>;

  return (
    <div className="flex flex-col gap-6">
      {query.saved && <Notice kind="ok">Saved.</Notice>}
      <section className="max-w-xl">
        <h2 className="mb-3 text-lg font-semibold">Call settings</h2>
        <form action={saveCallSettings} className="flex flex-col gap-4">
          <input type="hidden" name="slug" value={slug} />
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Days calls are taken</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <label key={d} className="flex items-center gap-1.5">
                  <input type="checkbox" name={`day_${d}`} defaultChecked={settings.days.includes(d)} className="h-4 w-4" />
                  {dayNames[d]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-4">
            <Field label="First call starts (UK time)">
              <input name="startTime" type="time" defaultValue={settings.startTime} className={`${inputClass} w-36`} />
            </Field>
            <Field label="Last call ends by">
              <input name="endTime" type="time" defaultValue={settings.endTime} className={`${inputClass} w-36`} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <Field label="Length of a call (minutes)">
              <input name="lengthMinutes" type="number" min={10} defaultValue={settings.lengthMinutes} className={`${inputClass} w-32`} />
            </Field>
            <Field label="Gap between calls (minutes)">
              <input name="gapMinutes" type="number" min={0} defaultValue={settings.gapMinutes} className={`${inputClass} w-32`} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <Field label="Bookable this many days ahead">
              <input name="windowDays" type="number" min={1} defaultValue={settings.windowDays} className={`${inputClass} w-32`} />
            </Field>
            <Field label="Shortest notice (hours)">
              <input name="noticeHours" type="number" min={0} defaultValue={settings.noticeHours} className={`${inputClass} w-32`} />
            </Field>
          </div>
          <Field label="Days off (one per line, as 2026-12-25)">
            <textarea name="daysOff" rows={2} defaultValue={settings.daysOff.join("\n")} className={inputClass} />
          </Field>
          <h3 className="mt-2 font-semibold">&quot;Call now&quot; alert for good-fit leads</h3>
          <div className="flex flex-wrap gap-4">
            <Field label="Fit score that triggers it">
              <input name="alertFit" type="number" min={0} max={100} defaultValue={settings.alertFit} className={`${inputClass} w-32`} />
            </Field>
            <Field label="Send alerts from">
              <input name="alertFrom" type="time" defaultValue={settings.alertFrom} className={`${inputClass} w-36`} />
            </Field>
            <Field label="Until">
              <input name="alertTo" type="time" defaultValue={settings.alertTo} className={`${inputClass} w-36`} />
            </Field>
          </div>
          <p className="text-xs text-neutral-500">
            Booking emails and alerts go to this brand&apos;s consultants (People tab). With no consultant yet, they go
            to the owner.
          </p>
          <button className={`${buttonClass} self-start`}>Save call settings</button>
        </form>
      </section>
    </div>
  );
}
