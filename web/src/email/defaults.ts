/**
 * The emails a new brand starts with. The layouts and the order come from the franOS email library
 * (named, not numbered). The wording is placeholder: the copywriter replaces it.
 */
export type Starter = {
  key: string;
  kind: string;
  trigger?: string;
  name?: string;
  layout?: string;
  position: number;
  dayOffset: number;
  subject: string;
  preview?: string;
  headline?: string;
  videoId?: string;
  showPs?: boolean;
  body: string;
};

const PLACEHOLDER = "Placeholder wording. The copywriter replaces it.";

const prospectus: Starter = {
  key: "prospectus",
  kind: "prospectus",
  name: "Prospectus",
  layout: "header",
  position: 0,
  dayOffset: 0,
  subject: "Your prospectus, {first_name}",
  preview: "Real owners, real numbers, everything you get.",
  headline: "Your {brand} Prospectus",
  showPs: false,
  body: "Hi {first_name},\n\nThanks for your interest. Here is the [franchise prospectus](page:prospectus). It sets out how the business works, what it costs and what you can expect.\n\nPlaceholder wording. Replace it in the Emails tab.",
};

// Reactions: sent 10 minutes after the lead does something. Personal, as if typed by the consultant.
const reactions: Starter[] = [
  {
    key: "react-prospectus",
    kind: "reaction",
    trigger: "prospectus_read",
    name: "Read the prospectus",
    layout: "personal",
    position: 100,
    dayOffset: 0,
    subject: "What did you make of it, {first_name}?",
    body: "Hi {first_name},\n\nI saw you had a look at the {brand} prospectus. What did you make of it?\n\nMost people have a few questions at this point. The quickest way to get them answered is a short call.\n\nPlaceholder wording. Replace it in the Emails tab.",
  },
  {
    key: "react-testimonial",
    kind: "reaction",
    trigger: "testimonial_watched",
    name: "Watched a testimonial",
    layout: "personal",
    position: 101,
    dayOffset: 0,
    subject: "Want to talk to {person}?",
    body: "Hi {first_name},\n\nI saw you watched {video_title}. Would it help to hear more about how {person} got started?\n\nBook a short call and I can tell you more, and put you in touch.\n\nPlaceholder wording. Replace it in the Emails tab.",
  },
];

// Nudges: sent when the lead has been stuck on a step. Two per step, then they stop. Personal.
const nudges: Starter[] = [
  {
    key: "nudge-prospectus-1",
    kind: "nudge",
    trigger: "no_prospectus",
    name: "Prospectus not opened",
    layout: "personal",
    position: 200,
    dayOffset: 3,
    subject: "Did you get the prospectus, {first_name}?",
    body: "Hi {first_name},\n\nI sent the {brand} prospectus over a few days ago and wanted to check it reached you. It is [here](page:prospectus) if you have not had a chance to read it.\n\nPlaceholder wording. Replace it in the Emails tab.",
  },
  {
    key: "nudge-prospectus-2",
    kind: "nudge",
    trigger: "no_prospectus",
    name: "Prospectus not opened (second)",
    layout: "personal",
    position: 201,
    dayOffset: 10,
    subject: "Your {brand} prospectus",
    body: "Hi {first_name},\n\nA last note about the prospectus. It answers most of the questions people have: what it costs, what you can earn and what the first months look like. You can read it [here](page:prospectus).\n\nPlaceholder wording. Replace it in the Emails tab.",
  },
  {
    key: "nudge-call-1",
    kind: "nudge",
    trigger: "no_call",
    name: "No call booked",
    layout: "personal",
    position: 210,
    dayOffset: 3,
    subject: "Shall we have a chat?",
    body: "Hi {first_name},\n\nYou have read the prospectus, so the next step is a short call. It is a chance to ask anything, with no commitment either way.\n\nPlaceholder wording. Replace it in the Emails tab.",
  },
  {
    key: "nudge-call-2",
    kind: "nudge",
    trigger: "no_call",
    name: "No call booked (second)",
    layout: "personal",
    position: 211,
    dayOffset: 10,
    subject: "Quick one, {first_name}",
    body: "Hi {first_name},\n\nIs {brand} still something you are thinking about? If it is, pick a time for a call and we can go through it properly. If the timing is wrong, no problem at all.\n\nPlaceholder wording. Replace it in the Emails tab.",
  },
];

/** A testimonial email: the video layout, linked to one of the brand's testimonial videos. */
const story = (n: number, length: "Short" | "Long"): Omit<Starter, "position" | "dayOffset" | "kind"> => ({
  key: `seq-vt${n}-${length.toLowerCase()}`,
  name: `VT${n} ${length}`,
  layout: "video",
  videoId: `vt${n}`,
  subject: `[VT${n} ${length}] A franchisee's story`,
  preview: "In their own words.",
  headline: `Franchisee ${n}'s Story. Watch It Below…`,
  body: `Hi {first_name},\n\n${length === "Short" ? "A short version" : "The full story"} of testimonial ${n}: who they were before, why they chose {brand}, and where they are now.\n\n- A result in numbers\n- A second result\n- What their week looks like\n\n${PLACEHOLDER}`,
});
/** A topic email: the standard styled layout. */
const topic = (key: string, name: string, headline: string, layout = "header"): Omit<Starter, "position" | "dayOffset" | "kind"> => ({
  key: `seq-${key}`,
  name,
  layout,
  subject: `[${name}] ${headline}`,
  preview: "",
  headline,
  body: `Hi {first_name},\n\nThe ${name} email. One idea, a few lines, and proof from a franchisee.\n\n- First point\n- Second point\n- Third point\n\n${PLACEHOLDER}`,
});

/**
 * The starting order from the franOS email library. One a day, in this order.
 * (The library's first email, Prospectus, is the sign-up email above.)
 */
const sequence: Starter[] = [
  story(1, "Short"),
  story(2, "Short"),
  topic("funding", "Funding", "Funding Available", "plain"),
  topic("marketing-1", "Marketing 1", "You Don't Need to Be a Marketer"),
  story(3, "Short"),
  story(4, "Short"),
  story(5, "Short"),
  topic("training", "Training", "No Experience Needed"),
  topic("marketing-2", "Marketing 2", "Where Your Customers Come From"),
  topic("uc1", "UC1", "Useful Content 1"),
  topic("day-in-the-life", "Day in the Life", "What Will You Actually Do All Day?"),
  story(1, "Long"),
  topic("support", "Support", "You're Never on Your Own"),
  topic("uc2", "UC2", "Useful Content 2"),
  topic("territory", "Territory", "Your Territory"),
  story(2, "Long"),
  topic("marketing-3", "Marketing 3", "What Your Ad Budget Gets You"),
  topic("uc3", "UC3", "Useful Content 3"),
  topic("questions", "Questions", "The Questions Worth Asking Us"),
  story(3, "Long"),
  topic("next-steps", "Next Steps", "From Your Call to Your First Customer"),
  topic("uc4", "UC4", "Useful Content 4"),
  topic("why-now", "Why Now", "Why Now?"),
  topic("book-a-call", "Book a Call", "Still on the Fence?"),
].map((email, i) => ({ ...email, kind: "sequence", position: 10 + i, dayOffset: 0 }));

/** What a new brand gets: the prospectus email, the 24-email sequence, two reactions and four nudges. */
export const starterEmails: Starter[] = [prospectus, ...sequence, ...reactions, ...nudges];

/** A small set with five numbered sequence emails. Used by the automatic tests, where short and predictable is better. */
export const placeholderEmails: Starter[] = [
  prospectus,
  ...[1, 2, 3, 4, 5].map((n) => ({
    key: `seq-0${n}`,
    kind: "sequence",
    position: n,
    dayOffset: 0,
    subject: `Placeholder email ${n}`,
    body: `Hi {first_name},\n\nPlaceholder email ${n}. A testimonial, a useful piece of content or an answer to a common worry goes here.\n\nYou can watch a franchisee's story [here](page:video/vt1).`,
  })),
  ...reactions,
  ...nudges,
];
