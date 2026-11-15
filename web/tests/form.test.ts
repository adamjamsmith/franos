import { describe, expect, it } from "vitest";
import { defaultForm, formFor, fullFormFor, qualifies, scoreFit, type FormConfig } from "../src/site/config";
import { answerCounts, mergeEdited } from "../src/site/form-edit";

const form: FormConfig = {
  questions: [
    {
      id: "timing",
      label: "When would you like to start?",
      scored: true,
      options: [
        { value: "soon", label: "Soon", mark: "great" },
        { value: "later", label: "Later", mark: "ok" },
        { value: "never", label: "Just looking", mark: "poor" },
      ],
    },
    {
      id: "money",
      label: "Do you have the investment?",
      scored: true,
      options: [
        { value: "yes", label: "Yes", mark: "great" },
        { value: "no", label: "No", mark: "poor" },
      ],
    },
    {
      id: "role",
      label: "What do you do now?",
      scored: false,
      options: [
        { value: "a", label: "A", mark: "ok" },
        { value: "b", label: "B", mark: "ok" },
      ],
    },
  ],
};

describe("the Fit score from marks", () => {
  it("counts Great as 2, OK as 1, Poor as 0, with every scored question equal", () => {
    expect(scoreFit(form, { timing: "soon", money: "yes", role: "a" }).score).toBe(100);
    expect(scoreFit(form, { timing: "later", money: "yes", role: "a" }).score).toBe(75);
    expect(scoreFit(form, { timing: "never", money: "no", role: "a" }).score).toBe(0);
  });

  it("leaves out a question that is for information only", () => {
    expect(scoreFit(form, { timing: "soon", money: "yes", role: "b" }).detail.map((d) => d.questionId)).toEqual(["timing", "money"]);
  });

  it("leaves out a question the lead was never asked, so a new question does not pull old leads down", () => {
    expect(scoreFit(form, { timing: "soon" }).score).toBe(100);
  });

  it("leaves out a question in the bin, and still counts an answer that was binned later", () => {
    const binnedQuestion = { questions: form.questions.map((q) => (q.id === "money" ? { ...q, removed: true } : q)) };
    expect(scoreFit(binnedQuestion, { timing: "later", money: "no" }).score).toBe(50);
    const binnedAnswer = {
      questions: form.questions.map((q) => (q.id === "timing" ? { ...q, options: q.options.map((o) => (o.value === "soon" ? { ...o, removed: true } : o)) } : q)),
    };
    expect(scoreFit(binnedAnswer, { timing: "soon", money: "yes" }).score).toBe(100);
  });
});

describe("must-haves", () => {
  const withMust = (values: string[]): FormConfig => ({
    questions: form.questions.map((q) => (q.id === "timing" ? { ...q, options: q.options.map((o) => (values.includes(o.value) ? { ...o, mustHave: true } : o)) } : q)),
  });

  it("everyone qualifies when there are none", () => {
    expect(qualifies(form, { timing: "never", money: "no", role: "a" })).toBe(true);
  });

  it("needs one of the ticked answers", () => {
    const must = withMust(["soon", "later"]);
    expect(qualifies(must, { timing: "soon" })).toBe(true);
    expect(qualifies(must, { timing: "later" })).toBe(true);
    expect(qualifies(must, { timing: "never" })).toBe(false);
  });

  it("ignores a must-have on a question that is in the bin", () => {
    const must = withMust(["soon"]);
    const binned = { questions: must.questions.map((q) => (q.id === "timing" ? { ...q, removed: true } : q)) };
    expect(qualifies(binned, { timing: "never" })).toBe(true);
  });
});

describe("reading a saved form", () => {
  it("turns a form saved with points into marks: top is Great, zero is Poor, between is OK", () => {
    const old = {
      form: {
        questions: [
          { id: "t", label: "T", options: [{ value: "a", label: "A", points: 25 }, { value: "b", label: "B", points: 5 }, { value: "c", label: "C", points: 0 }] },
          { id: "r", label: "R", options: [{ value: "x", label: "X", points: 0 }, { value: "y", label: "Y", points: 0 }] },
        ],
      },
    };
    const read = fullFormFor(old);
    expect(read.questions[0].options.map((o) => o.mark)).toEqual(["great", "ok", "poor"]);
    expect(read.questions[0].scored).toBe(true);
    expect(read.questions[1].scored).toBe(false);
  });

  it("falls back to the starter form when nothing is saved", () => {
    expect(formFor({ form: null }).questions.length).toBe(defaultForm().questions.length);
  });

  it("shows visitors only live questions and answers", () => {
    const saved = {
      form: {
        questions: [
          { ...form.questions[0], options: [...form.questions[0].options, { value: "gone", label: "Gone", mark: "ok", removed: true }] },
          { ...form.questions[1], removed: true },
          { id: "draft", label: "Draft", scored: true, options: [{ value: "one", label: "One", mark: "ok" }, { value: "two", label: "", mark: "ok" }] },
        ],
      },
    };
    const live = formFor(saved);
    expect(live.questions.map((q) => q.id)).toEqual(["timing"]);
    expect(live.questions[0].options.map((o) => o.value)).toEqual(["soon", "later", "never"]);
  });
});

describe("saving the form from the settings screen", () => {
  const none = new Set<string>();
  const edit = (change: (questions: FormConfig["questions"]) => unknown[]) => ({ questions: change(structuredClone(form.questions)) });

  it("keeps new wording, marks and must-haves", () => {
    const saved = mergeEdited(
      form,
      edit((qs) => {
        qs[0].label = "  When do you want to start? ";
        qs[0].options[0] = { ...qs[0].options[0], label: "Within 3 months", mustHave: true };
        qs[0].options[1].mark = "poor";
        return qs;
      }),
      none,
    );
    expect(saved.questions[0].label).toBe("When do you want to start?");
    expect(saved.questions[0].options[0]).toMatchObject({ label: "Within 3 months", mustHave: true });
    expect(saved.questions[0].options[1].mark).toBe("poor");
    expect(saved.questions[1]).toEqual(form.questions[1]);
  });

  it("puts cleared wording back as it was, and drops something new with no wording", () => {
    const saved = mergeEdited(
      form,
      edit((qs) => {
        qs[0].label = "   ";
        qs[0].options[0].label = "";
        qs[0].options.push({ value: "anew", label: " ", mark: "ok" });
        return [...qs, { id: "qnew", label: "", scored: true, options: [] }];
      }),
      none,
    );
    expect(saved).toEqual(form);
  });

  it("adds a question and its answers, in the order given", () => {
    const saved = mergeEdited(
      form,
      edit((qs) => [
        { id: "qvan", label: "Do you have a van?", scored: false, options: [{ value: "ay", label: "Yes", mark: "great" }, { value: "an", label: "No", mark: "poor" }] },
        ...qs.reverse(),
      ]),
      none,
    );
    expect(saved.questions.map((q) => q.id)).toEqual(["qvan", "role", "money", "timing"]);
    expect(formFor({ form: saved }).questions[0].options.map((o) => o.label)).toEqual(["Yes", "No"]);
  });

  it("counts a question towards the Fit score only when its answers carry different marks", () => {
    const saved = mergeEdited(
      form,
      edit((qs) => {
        qs[1].options.forEach((o) => (o.mark = "ok"));
        qs[2].options[0].mark = "great";
        return qs;
      }),
      none,
    );
    expect(saved.questions.map((q) => q.scored)).toEqual([true, false, true]);
  });

  it("never loses what a lead has answered: a dropped question or answer goes to the bin", () => {
    const picked = new Set(["timing|never", "money|yes"]);
    const saved = mergeEdited(
      form,
      edit((qs) => {
        qs[0].options = qs[0].options.filter((o) => o.value === "soon");
        return [qs[0], qs[2]];
      }),
      picked,
    );
    // "later" was never picked, so it is gone; "never" was, so it is binned.
    expect(saved.questions[0].options).toEqual([form.questions[0].options[0], { ...form.questions[0].options[2], removed: true }]);
    // The money question was answered, so it is binned, not lost.
    expect(saved.questions.find((q) => q.id === "money")).toMatchObject({ removed: true });
    expect(formFor({ form: saved }).questions.map((q) => q.id)).toEqual(["role"]);
  });

  it("restores a binned question with the same id, so old answers link back up", () => {
    const binned = { questions: form.questions.map((q) => (q.id === "money" ? { ...q, removed: true } : q)) };
    expect(scoreFit(binned, { timing: "soon", money: "no" }).score).toBe(100);
    const restored = mergeEdited(binned, { questions: binned.questions.map((q) => ({ ...q, removed: false })) }, new Set(["money|no"]));
    expect(restored).toEqual(form);
    expect(scoreFit(restored, { timing: "soon", money: "no" }).score).toBe(50);
  });

  it("a must-have does not survive on an answer in the bin", () => {
    const saved = mergeEdited(form, edit((qs) => { qs[0].options[0] = { ...qs[0].options[0], mustHave: true, removed: true }; return qs; }), none);
    expect(saved.questions[0].options[0]).toEqual({ ...form.questions[0].options[0], removed: true });
  });

  it("ignores rubbish: bad ids, repeats, and anything that is not a form", () => {
    expect(mergeEdited(form, "nonsense", none).questions).toEqual([]);
    const saved = mergeEdited(form, edit((qs) => [qs[0], qs[0], { id: "bad id!", label: "X", scored: true, options: [] }]), none);
    expect(saved.questions.map((q) => q.id)).toEqual(["timing"]);
  });

  it("counts how leads answered", () => {
    const picked = answerCounts([{ timing: "soon", why: "x" }, { timing: "soon" }, { timing: "later" }, null]);
    expect(picked.get("timing|soon")).toBe(2);
    expect(picked.get("timing|later")).toBe(1);
  });
});
