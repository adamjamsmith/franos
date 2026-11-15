import { answerOutcome } from "@/app/b/[slug]/work-actions";
import { ukWhen } from "@/calls/time";
import { OutcomeForm } from "@/components/outcome-form";
import { ANSWERS, BANT, type CallOutcome, NEXT_MOVES, REASONS } from "@/work/outcomes";

type CallLike = { id: string; startsAt: Date; outcome: unknown; goodCall: boolean | null };

/**
 * "How did it go?" for one call the lead showed up to: six quick questions.
 * franOS works out "good call" from the answers. Saving again corrects them.
 */
export function OutcomeBlock({
  slug,
  leadId,
  call,
  canManage,
  requirements,
  back,
}: {
  slug: string;
  leadId: string;
  back: string;
  call: CallLike;
  canManage: boolean;
  /** The brand's "this is for you if" list, shown beside the question about the kind of person we want. */
  requirements: string[];
}) {
  const saved = call.outcome as CallOutcome | null;

  const summary = saved && (
    <div className="text-sm">
      <p className="mb-1">
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium text-neutral-900 dark:text-white ${call.goodCall ? "bg-green-500/20" : "bg-red-500/20"}`}>
          {call.goodCall ? "Good call" : "Not a good call"}
        </span>{" "}
        <span className="text-xs text-neutral-500 dark:text-neutral-400">Next: {NEXT_MOVES[saved.next]}</span>
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {BANT.map((b) => `${b.label}: ${ANSWERS[saved[b.key]]}`).join(" · ")} · Kind of person we want: {saved.rightPerson ? "Yes" : "No"}
      </p>
      {saved.notes && <p className="mt-1 whitespace-pre-line">{saved.notes}</p>}
    </div>
  );
  if (!canManage) return summary || <p className="text-sm text-neutral-500">Waiting for the consultant to say how it went.</p>;

  const form = (
    <OutcomeForm
      action={answerOutcome}
      slug={slug}
      leadId={leadId}
      callId={call.id}
      back={back}
      initial={
        saved
          ? { budget: saved.budget, authority: saved.authority, need: saved.need, timing: saved.timing, rightPerson: saved.rightPerson ? "yes" : "no", next: saved.next, notes: saved.notes }
          : {}
      }
      isCorrection={Boolean(saved)}
      bant={BANT}
      answers={ANSWERS}
      nextMoves={NEXT_MOVES}
      reasons={REASONS}
      requirements={requirements}
    />
  );

  if (!saved) {
    return (
      <div className="rounded-md bg-amber-500/10 p-3">
        <p className="mb-2 text-sm font-semibold">How did it go? ({ukWhen(call.startsAt)})</p>
        {form}
      </div>
    );
  }
  return (
    <div>
      {summary}
      <details className="mt-1 text-sm">
        <summary className="cursor-pointer text-xs text-neutral-500 underline-offset-2 hover:underline dark:text-neutral-400">Correct</summary>
        <div className="mt-3">{form}</div>
      </details>
    </div>
  );
}
