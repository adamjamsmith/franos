import type { BoxState, Meter } from "@/work/meter";

const line = "border-neutral-300 dark:border-neutral-700";
const label = "text-[11px] leading-tight text-neutral-500 dark:text-neutral-400";
const value = "text-xs font-medium leading-tight text-neutral-900 dark:text-white";

/** Soft, see-through tints: green, amber, red, or nothing. */
const tint = { green: "bg-green-500/20", amber: "bg-amber-500/20", red: "bg-red-500/20", none: "" };
const fitTint = { good: tint.green, middle: tint.amber, low: tint.red };
const interestTint = { Cold: tint.none, Warming: tint.amber, Warm: tint.amber, Hot: tint.green };
const boxTint: Record<BoxState, string> = { done: tint.green, part: tint.amber, missed: tint.red, todo: tint.none };

/**
 * A lead at a glance. On top: Fit, Interest, and what they have watched. Under them the timeline,
 * one row of five: Prospectus, Booking, Next steps, Questions, Call. Each box says how many times
 * it has happened and when. The next step has the bright border.
 */
export function LeadMeter({ meter }: { meter: Meter }) {
  const chip = `flex items-baseline gap-1.5 rounded-md border px-2 py-1 ${line}`;
  const chips = [
    { name: "Fit", text: String(meter.fit.score ?? "—"), colour: meter.fit.score === null ? tint.none : fitTint[meter.fit.band] },
    { name: meter.interest.word, text: `${meter.interest.done}/${meter.interest.of}`, colour: interestTint[meter.interest.word] },
    { name: "Intro video", text: `${meter.watched.video}%`, colour: meter.watched.video >= 50 ? tint.green : meter.watched.video > 0 ? tint.amber : tint.none },
    { name: "Testimonials", text: String(meter.watched.testimonials), colour: meter.watched.testimonials > 0 ? tint.green : tint.none },
  ];
  return (
    <div role="group" aria-label="Where this lead stands">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <div key={c.name} className={`${chip} ${c.colour}`}>
            <span className={label}>{c.name}</span>
            <span className={value}>{c.text}</span>
          </div>
        ))}
      </div>
      <p className={`${label} mb-1`}>Timeline</p>
      <div className={`grid grid-cols-5 overflow-hidden rounded-md border ${line}`}>
        {meter.timeline.map((box, index) => (
          <div
            key={box.key}
            className={`min-w-0 px-2 py-1.5 ${index > 0 ? `border-l ${line}` : ""} ${boxTint[box.state]} ${
              box.next ? "ring-1 ring-inset ring-neutral-900 dark:ring-white" : ""
            }`}
          >
            <p className={`${label} truncate`}>{box.label}</p>
            <p className={`${value} truncate`}>{box.status}</p>
            <p className={`${label} truncate`}>{box.when || " "}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
