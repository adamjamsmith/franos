import { type FormConfig, liveOptions, type Option, type Question, readForm } from "./config";

/** Saving a brand's sign-up form from the Form settings screen. */

const ID = /^[A-Za-z0-9_-]{1,40}$/;
const clean = (text: string) => text.trim().replace(/\s+/g, " ").slice(0, 300);

/** Whether any lead has answered this question. `picked` holds "questionId|value" for every answer given. */
export const answered = (questionId: string, picked: Iterable<string>) => {
  for (const key of picked) if (key.startsWith(`${questionId}|`)) return true;
  return false;
};

/**
 * A question counts towards the Fit score only if its answers carry different marks.
 * If every answer is marked the same, it cannot tell one lead from another, so it is for information only.
 */
export const tellsLeadsApart = (q: Question) => new Set(liveOptions(q).map((o) => o.mark)).size > 1;

/**
 * Takes the form as it was edited on screen and makes it safe to save.
 * - Wording that was cleared falls back to what it was; something new with no wording is dropped.
 * - Nothing a lead has answered can be lost: a question or answer that was left out goes to the bin instead.
 */
export function mergeEdited(current: FormConfig, incoming: unknown, picked: Set<string>): FormConfig {
  const before = new Map(current.questions.map((q) => [q.id, q]));
  const seen = new Set<string>();
  const questions: Question[] = [];

  for (const q of readForm(incoming).questions.slice(0, 60)) {
    if (!ID.test(q.id) || seen.has(q.id)) continue;
    const was = before.get(q.id);
    const label = clean(q.label) || was?.label || "";
    if (!label) continue;
    seen.add(q.id);

    const wasOptions = new Map((was?.options ?? []).map((o) => [o.value, o]));
    const values = new Set<string>();
    const options: Option[] = [];
    for (const o of q.options.slice(0, 30)) {
      if (!ID.test(o.value) || values.has(o.value)) continue;
      const text = clean(o.label) || wasOptions.get(o.value)?.label || "";
      if (!text) continue;
      values.add(o.value);
      options.push({
        value: o.value,
        label: text,
        mark: o.mark,
        ...(o.mustHave && !o.removed ? { mustHave: true } : {}),
        ...(o.removed ? { removed: true } : {}),
      });
    }
    for (const o of was?.options ?? []) {
      if (!values.has(o.value) && picked.has(`${q.id}|${o.value}`)) options.push({ value: o.value, label: o.label, mark: o.mark, removed: true });
    }

    const question: Question = { id: q.id, label, scored: false, options, ...(q.removed ? { removed: true } : {}) };
    questions.push({ ...question, scored: tellsLeadsApart(question) });
  }

  for (const q of current.questions) {
    if (!seen.has(q.id) && answered(q.id, picked)) questions.push({ ...q, removed: true });
  }
  return { questions };
}

/** How many leads gave each answer. Keys are "questionId|value". */
export function answerCounts(allAnswers: unknown[]): Map<string, number> {
  const picked = new Map<string, number>();
  for (const raw of allAnswers) {
    for (const [questionId, value] of Object.entries((raw ?? {}) as Record<string, unknown>)) {
      if (typeof value !== "string") continue;
      const key = `${questionId}|${value}`;
      picked.set(key, (picked.get(key) ?? 0) + 1);
    }
  }
  return picked;
}
