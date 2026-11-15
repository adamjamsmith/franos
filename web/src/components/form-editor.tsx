"use client";

import { useEffect, useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { type FormConfig, type Mark, MARKS, onForm, type Option, type Question } from "@/site/config";

type Props = {
  slug: string;
  initial: FormConfig;
  /** How many leads gave each answer, keyed "questionId|value". Anything here goes to the bin when removed. */
  picked: Record<string, number>;
  save: (slug: string, form: FormConfig) => Promise<FormConfig>;
};
type Draft = { label: string; mark: Mark | ""; mustHave: boolean };
type Grab = { kind: "question"; id: string } | { kind: "answer"; questionId: string; value: string } | null;

const emptyDraft: Draft = { label: "", mark: "", mustHave: false };
const newId = (prefix: string) => prefix + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
const isMark = (v: string): v is Mark => v === "great" || v === "ok" || v === "poor";

function moved<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const line = "border-neutral-300 dark:border-neutral-700";
const row = `grid grid-cols-[2.5rem_minmax(0,1fr)_7.5rem_2.5rem] items-stretch border-t text-sm ${line}`;
const cell = `flex items-center justify-center border-l ${line}`;
const textBox = "w-full bg-transparent px-3 py-2 text-left outline-none placeholder:text-neutral-400 focus:bg-white dark:focus:bg-neutral-950";
const pick = "h-full w-full cursor-pointer bg-transparent px-2 text-left outline-none dark:[color-scheme:dark]";
/** The open drop-down list: solid background and strong text, so it reads in both themes. */
const choice = "bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const iconButton = "flex h-full w-full items-center justify-center text-xs text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100";
const questionRow = `${row} bg-white dark:bg-neutral-950`;
const answerRow = `${row} bg-white dark:bg-neutral-950`;
const entryRow = `${row} bg-neutral-100 dark:bg-neutral-900`;
const typeCell = `flex items-center border-l px-3 text-neutral-500 ${line}`;
const dropHere = "outline outline-2 -outline-offset-2 outline-neutral-900 dark:outline-neutral-100";

/**
 * The form questions as one tight table. A question opens to show its answers; each answer has a mark
 * (Great, OK or Poor) and an asterisk that turns green when it is a must-have. Rows are dragged to reorder.
 * Changes are held on screen until Save is pressed.
 */
export function FormEditor({ slug, initial, picked, save }: Props) {
  const [questions, setQuestions] = useState<Question[]>(initial.questions);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [newQuestion, setNewQuestion] = useState("");
  const [dirty, setDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saving, startSaving] = useTransition();
  const [grab, setGrab] = useState<Grab>(null);
  const [over, setOver] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const touched = () => {
    setDirty(true);
    setJustSaved(false);
  };
  const change = (next: (list: Question[]) => Question[]) => {
    setQuestions(next);
    touched();
  };
  const used = (questionId: string, value?: string) =>
    value === undefined ? Object.keys(picked).some((key) => key.startsWith(`${questionId}|`)) : (picked[`${questionId}|${value}`] ?? 0) > 0;

  const editQuestion = (id: string, patch: Partial<Question>) => change((list) => list.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const editOptions = (id: string, next: (options: Option[]) => Option[]) =>
    change((list) => list.map((q) => (q.id === id ? { ...q, options: next(q.options) } : q)));
  const editOption = (id: string, value: string, patch: Partial<Option>) =>
    editOptions(id, (options) => options.map((o) => (o.value === value ? { ...o, ...patch } : o)));

  // Removing something leads have answered sends it to the bin; anything else just goes.
  const removeQuestion = (id: string) =>
    change((list) => (used(id) ? list.map((q) => (q.id === id ? { ...q, removed: true } : q)) : list.filter((q) => q.id !== id)));
  const removeOption = (id: string, value: string) =>
    editOptions(id, (options) =>
      used(id, value) ? options.map((o) => (o.value === value ? { ...o, removed: true, mustHave: false } : o)) : options.filter((o) => o.value !== value),
    );

  const draftOf = (id: string) => drafts[id] ?? emptyDraft;
  const setDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((all) => ({ ...all, [id]: { ...(all[id] ?? emptyDraft), ...patch } }));
    touched();
  };
  const withDraft = (q: Question, draft: Draft): Question =>
    draft.label.trim() === ""
      ? q
      : {
          ...q,
          options: [...q.options, { value: newId("a"), label: draft.label.trim(), mark: draft.mark || "ok", ...(draft.mustHave ? { mustHave: true } : {}) }],
        };
  const addAnswer = (id: string) => {
    const draft = draftOf(id);
    if (draft.label.trim() === "") return;
    change((list) => list.map((q) => (q.id === id ? withDraft(q, draft) : q)));
    setDrafts((all) => ({ ...all, [id]: emptyDraft }));
  };
  const withNewQuestion = (list: Question[], label: string): Question[] =>
    label.trim() === "" ? list : [...list, { id: newId("q"), label: label.trim(), scored: false, options: [] }];
  const addQuestion = () => {
    if (newQuestion.trim() === "") return;
    const next = withNewQuestion(questions, newQuestion);
    change(() => next);
    setOpen((ids) => new Set(ids).add(next[next.length - 1].id));
    setNewQuestion("");
  };

  // Anything typed into an "Enter answer" or "Enter question" box is saved too, so nothing typed is lost.
  const onSave = () => {
    const complete = withNewQuestion(questions.map((q) => withDraft(q, draftOf(q.id))), newQuestion);
    startSaving(async () => {
      const stored = await save(slug, { questions: complete });
      setQuestions(stored.questions);
      setDrafts({});
      setNewQuestion("");
      setDirty(false);
      setJustSaved(true);
    });
  };

  const toggle = (id: string) =>
    setOpen((ids) => {
      const next = new Set(ids);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const dropOnQuestion = (targetId: string) => {
    if (grab?.kind === "question") {
      change((list) => moved(list, list.findIndex((q) => q.id === grab.id), list.findIndex((q) => q.id === targetId)));
    }
    setGrab(null);
    setOver(null);
  };
  const dropOnAnswer = (questionId: string, targetValue: string) => {
    if (grab?.kind === "answer" && grab.questionId === questionId) {
      editOptions(questionId, (options) => moved(options, options.findIndex((o) => o.value === grab.value), options.findIndex((o) => o.value === targetValue)));
    }
    setGrab(null);
    setOver(null);
  };
  const endDrag = () => {
    setGrab(null);
    setOver(null);
  };

  const live = questions.filter((q) => !q.removed);
  const binnedQuestions = questions.filter((q) => q.removed);
  const binnedAnswers = live.flatMap((q) => q.options.filter((o) => o.removed).map((o) => ({ q, o })));
  const leadsWord = (n: number) => (n === 1 ? "1 lead" : `${n} leads`);

  return (
    <div className="max-w-3xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Form questions</h2>
        <button onClick={onSave} disabled={!dirty || saving} className={`${buttonClass} disabled:opacity-40`}>
          {saving ? "Saving..." : justSaved && !dirty ? "Saved" : "Save"}
        </button>
      </div>

      <div className={`overflow-hidden rounded-lg border border-t-0 ${line}`}>
        {live.map((q, index) => {
          const isOpen = open.has(q.id);
          const shown = q.options.filter((o) => !o.removed);
          const draft = draftOf(q.id);
          const questionKey = `q:${q.id}`;
          return (
            <div key={q.id}>
              <div
                className={`${questionRow} ${over === questionKey ? dropHere : ""}`}
                draggable={grab?.kind === "question" && grab.id === q.id}
                onDragOver={(e) => {
                  if (grab?.kind !== "question") return;
                  e.preventDefault();
                  setOver(questionKey);
                }}
                onDrop={() => dropOnQuestion(q.id)}
                onDragEnd={endDrag}
              >
                <div
                  className={`flex cursor-grab items-center justify-center ${onForm(q) ? "text-neutral-500" : "text-amber-600"}`}
                  title={onForm(q) ? "Drag to move" : "Not on the form yet: it needs at least two answers"}
                  onMouseDown={() => setGrab({ kind: "question", id: q.id })}
                  onMouseUp={endDrag}
                >
                  {index + 1}
                </div>
                <div className={cell}>
                  <button onClick={() => toggle(q.id)} aria-expanded={isOpen} aria-label={isOpen ? "Close question" : "Open question"} className="h-full pl-3 pr-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
                    <span className={`inline-block transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`}>›</span>
                  </button>
                  <input value={q.label} onChange={(e) => editQuestion(q.id, { label: e.target.value })} aria-label="Question" className={`${textBox} pl-2 font-medium`} />
                </div>
                <div className={typeCell}>Radio button</div>
                <div className={cell}>
                  <button onClick={() => removeQuestion(q.id)} aria-label="Remove question" className={iconButton}>
                    ✕
                  </button>
                </div>
              </div>

              {isOpen && (
                <>
                  {shown.map((o) => {
                    const answerKey = `a:${q.id}:${o.value}`;
                    return (
                      <div
                        key={o.value}
                        className={`${answerRow} ${over === answerKey ? dropHere : ""}`}
                        draggable={grab?.kind === "answer" && grab.questionId === q.id && grab.value === o.value}
                        onDragOver={(e) => {
                          if (grab?.kind !== "answer" || grab.questionId !== q.id) return;
                          e.preventDefault();
                          setOver(answerKey);
                        }}
                        onDrop={() => dropOnAnswer(q.id, o.value)}
                        onDragEnd={endDrag}
                      >
                        <button
                          onClick={() => editOption(q.id, o.value, { mustHave: !o.mustHave })}
                          aria-pressed={o.mustHave === true}
                          aria-label="Must have"
                          title="Must have"
                          className={`${o.mustHave ? "bg-green-500 text-black" : "bg-neutral-200 text-neutral-500 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"}`}
                        >
                          ✱
                        </button>
                        <div className={cell}>
                          <span
                            className="cursor-grab select-none pl-3 pr-1 text-xs text-neutral-400"
                            title="Drag to move"
                            onMouseDown={() => setGrab({ kind: "answer", questionId: q.id, value: o.value })}
                            onMouseUp={endDrag}
                          >
                            ⋮⋮
                          </span>
                          <input value={o.label} onChange={(e) => editOption(q.id, o.value, { label: e.target.value })} aria-label="Answer" className={`${textBox} pl-1`} />
                        </div>
                        <div className={cell} title={used(q.id, o.value) ? `Picked by ${leadsWord(picked[`${q.id}|${o.value}`])}` : undefined}>
                          <select
                            value={o.mark}
                            onChange={(e) => isMark(e.target.value) && editOption(q.id, o.value, { mark: e.target.value })}
                            aria-label="Score"
                            className={pick}
                          >
                            {MARKS.map((m) => (
                              <option key={m.value} value={m.value} className={choice}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className={cell}>
                          <button onClick={() => removeOption(q.id, o.value)} aria-label="Remove answer" className={iconButton}>
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div className={entryRow}>
                    <button
                      onClick={() => setDraft(q.id, { mustHave: !draft.mustHave })}
                      aria-pressed={draft.mustHave}
                      aria-label="Must have"
                      title="Must have"
                      className={`${draft.mustHave ? "bg-green-500 text-black" : "bg-neutral-200 text-neutral-500 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"}`}
                    >
                      ✱
                    </button>
                    <div className={cell}>
                      <input
                        value={draft.label}
                        onChange={(e) => setDraft(q.id, { label: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && addAnswer(q.id)}
                        placeholder="Enter answer..."
                        aria-label="New answer"
                        className={textBox}
                      />
                    </div>
                    <div className={cell}>
                      <select
                        value={draft.mark}
                        onChange={(e) => setDraft(q.id, { mark: isMark(e.target.value) ? e.target.value : "" })}
                        aria-label="Score for the new answer"
                        className={`${pick} ${draft.mark === "" ? "text-neutral-400" : ""}`}
                      >
                        <option value="" className={choice}>
                          choose score...
                        </option>
                        {MARKS.map((m) => (
                          <option key={m.value} value={m.value} className={choice}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={cell}>
                      <button onClick={() => addAnswer(q.id)} aria-label="Add answer" className={`${iconButton} !text-base`}>
                        +
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}

        <div className={entryRow}>
          <div />
          <div className={cell}>
            <input
              value={newQuestion}
              onChange={(e) => {
                setNewQuestion(e.target.value);
                touched();
              }}
              onKeyDown={(e) => e.key === "Enter" && addQuestion()}
              placeholder="Enter question..."
              aria-label="New question"
              className={textBox}
            />
          </div>
          <div className={`${typeCell} !text-neutral-400`}>Radio button</div>
          <div className={cell}>
            <button onClick={addQuestion} aria-label="Add question" className={`${iconButton} !text-base`}>
              +
            </button>
          </div>
        </div>
      </div>

      {(binnedQuestions.length > 0 || binnedAnswers.length > 0) && (
        <div className="mt-6 text-sm">
          <h3 className="mb-1 font-semibold">Bin</h3>
          <ul className="flex flex-col gap-1">
            {binnedQuestions.map((q) => (
              <li key={q.id} className="flex items-center gap-3">
                <span className="text-neutral-600 dark:text-neutral-400">{q.label}</span>
                <button onClick={() => editQuestion(q.id, { removed: false })} className="underline">
                  Restore
                </button>
              </li>
            ))}
            {binnedAnswers.map(({ q, o }) => (
              <li key={`${q.id}|${o.value}`} className="flex items-center gap-3">
                <span className="text-neutral-600 dark:text-neutral-400">
                  {q.label} › {o.label}
                </span>
                <button onClick={() => editOption(q.id, o.value, { removed: false })} className="underline">
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
