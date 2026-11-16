import { saveSessionSettings } from "@/app/b/[slug]/calls/session-actions";
import { buttonClass, Field, inputClass, Notice } from "@/components/ui";
import { requireBrand } from "@/lib/session";
import { sessionSettingsFor } from "@/sessions/sessions";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const links = [
  { kind: "testimonial", name: "Franchisee testimonial" },
  { kind: "franchisor", name: "Franchisor interview" },
  { kind: "other", name: "General recording" },
] as const;

/** When each session booking link offers times: one set of hours per link. Sessions the owner books by hand can be at any time. */
export default async function SessionSettingsPage({ params, searchParams }: PageProps<"/b/[slug]/settings/sessions">) {
  const { slug } = await params;
  const query = await searchParams;
  const { client, role } = await requireBrand(slug);
  if (role !== "owner") return <p className="text-sm text-neutral-500">Only the owner can change the session settings.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Session settings</h2>
        <p className="text-xs text-neutral-500">
          The times people can pick from each booking link. A session you book yourself can be at any time. Days off are shared with calls: set them on the Calls tab.
        </p>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-3">
        {links.map(({ kind, name }) => {
          const settings = sessionSettingsFor(client, kind);
          return (
            <form key={kind} action={saveSessionSettings} className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="kind" value={kind} />
              <h3 className="font-semibold">{name}</h3>
              {query.saved === kind && <Notice kind="ok">Saved.</Notice>}
              <fieldset>
                <legend className="mb-1 text-sm font-medium">Days</legend>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <label key={d} className="flex items-center gap-1.5">
                      <input type="checkbox" name={`day_${d}`} defaultChecked={settings.days.includes(d)} className="h-4 w-4" />
                      {dayNames[d].slice(0, 3)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From (UK time)">
                  <input name="startTime" type="time" defaultValue={settings.startTime} className={inputClass} />
                </Field>
                <Field label="Until">
                  <input name="endTime" type="time" defaultValue={settings.endTime} className={inputClass} />
                </Field>
                <Field label="Length (minutes)">
                  <input name="lengthMinutes" type="number" min={15} max={240} defaultValue={settings.lengthMinutes} className={inputClass} />
                </Field>
                <Field label="Gap between (minutes)">
                  <input name="gapMinutes" type="number" min={0} defaultValue={settings.gapMinutes} className={inputClass} />
                </Field>
                <Field label="Days ahead">
                  <input name="windowDays" type="number" min={1} max={90} defaultValue={settings.windowDays} className={inputClass} />
                </Field>
                <Field label="Notice (hours)">
                  <input name="noticeHours" type="number" min={0} defaultValue={settings.noticeHours} className={inputClass} />
                </Field>
              </div>
              <button className={`${buttonClass} self-start`}>Save</button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
