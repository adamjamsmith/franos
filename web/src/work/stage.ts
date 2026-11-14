/**
 * Where a lead sits on the opportunity board. Worked out from what has happened, never dragged.
 * "lead" means not an opportunity yet: they are in the Leads list but not on the board.
 */
export type Stage = "lead" | "goodfit" | "scheduled" | "interested" | "closing" | "signed" | "closed";

export const STAGES: { key: Exclude<Stage, "lead" | "closed">; label: string; meaning: string }[] = [
  { key: "goodfit", label: "Good fit", meaning: "Scored well on the form and has no call booked. Worth calling." },
  { key: "scheduled", label: "Call scheduled", meaning: "Has a call coming up." },
  { key: "interested", label: "Interested", meaning: "Has had a call and is still in play." },
  { key: "closing", label: "Closing", meaning: "More than interested. Needs regular follow-up. Moved here by hand." },
  { key: "signed", label: "Signed", meaning: "Signed." },
];
export const STAGE_NAMES: Record<Stage, string> = {
  lead: "Lead (not on the board yet)",
  goodfit: "Good fit",
  scheduled: "Call scheduled",
  interested: "Interested",
  closing: "Closing",
  signed: "Signed",
  closed: "Not going ahead",
};

type LeadLike = { outcome: string | null; closingAt: Date | null; fitScore: number | null };
type CallLike = { status: string; startsAt: Date; endsAt: Date; goodCall: boolean | null; outcome: unknown };

export type Placement = {
  stage: Stage;
  /** Their last call was a no-show and nothing is booked: the job is to rebook them. */
  missedCall: boolean;
  /** A call they showed up to that has no "How did it go?" answers yet. */
  waitingForOutcome: boolean;
  /** At least one of their calls came out as a good call. A label, not a column. */
  goodCall: boolean;
  nextCall: Date | null;
  /** Their most recent call that they showed up to. */
  lastCall: Date | null;
};

/**
 * The column a lead belongs in. It shows the furthest they have got:
 * signed, then closing (set by hand), then interested (showed up for a call),
 * then call scheduled, then good fit. Anyone else is a lead, not yet an opportunity.
 */
export function placeLead(lead: LeadLike, calls: CallLike[], now: Date, goodFitFrom: number): Placement {
  const live = calls.filter((c) => c.status !== "cancelled").sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const upcoming = live.find((c) => c.status === "booked" && c.endsAt > now) ?? null;
  const attended = live.filter((c) => c.status === "attended");
  const last = live.filter((c) => c.status !== "booked" || c.endsAt <= now).at(-1);
  const base = {
    missedCall: !upcoming && last?.status === "no_show",
    waitingForOutcome: attended.some((c) => !c.outcome),
    goodCall: attended.some((c) => c.goodCall),
    nextCall: upcoming?.startsAt ?? null,
    lastCall: attended.at(-1)?.startsAt ?? null,
  };
  const stage: Stage =
    lead.outcome === "signed"
      ? "signed"
      : lead.outcome === "not_interested"
        ? "closed"
        : lead.closingAt
          ? "closing"
          : attended.length > 0
            ? "interested"
            : upcoming
              ? "scheduled"
              : (lead.fitScore ?? 0) >= goodFitFrom
                ? "goodfit"
                : "lead";
  return { ...base, stage };
}

/** The one thing to do next for this lead, in plain words. */
export function nextAction(placed: Placement): string {
  if (placed.stage === "signed") return "Nothing. They have signed.";
  if (placed.stage === "closed") return "Nothing. They are not going ahead.";
  if (placed.waitingForOutcome) return "Say how the call went (six quick questions).";
  if (placed.nextCall) return "Take the call.";
  if (placed.missedCall) return "They missed their call. Ring them and rebook.";
  if (placed.stage === "closing") return "Follow up and keep in touch until they sign.";
  if (placed.stage === "interested") return "Follow up: book a second call or send next steps.";
  if (placed.stage === "goodfit") return "Call them now, or book a call for them.";
  return "Nothing yet. The emails are doing the work.";
}
