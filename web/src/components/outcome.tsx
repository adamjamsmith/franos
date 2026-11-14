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
        <span className={`rounded px-1.5 py-0.5 font-semibold ${call.goodCall ? "bg-green-100 text-green-900" : "bg-neutral-200 text-neutral-800"}`}>
          {call.goodCall ? "Good call" : "Not a good call"}
        </span>{" "}
        · Next: {NEXT_MOVES[saved.next]}
      </p>
      <p className="text-neutral-600 dark:text-neutral-400">
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
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
        <p className="mb-2 text-sm font-semibold">How did it go? ({ukWhen(call.startsAt)})</p>
        {form}
      </div>
    );
  }
  return (
    <div>
      {summary}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer underline">Correct these answers</summary>
        <div className="mt-3">{form}</div>
      </details>
    </div>
  );
}
