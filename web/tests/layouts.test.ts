import { describe, expect, it } from "vitest";
import { starterEmails } from "../src/email/defaults";
import { emailSettingsFor, type NextStep, renderEmail, type RenderInput } from "../src/email/render";
import { defaultSite } from "../src/site/config";

const site = {
  ...defaultSite("Refresh Renovation"),
  primaryColour: "#1a8f3f",
  videos: [{ id: "vt1", title: "Ali's story", person: "Ali", url: "/a.mp4" }],
};
const settings = {
  ...emailSettingsFor("Refresh Renovation", site),
  signatureName: "Mike Smith",
  signaturePhone: "07000 000000",
  signatureEmail: "mike@example.test",
  videoBoxText: "Mike explains how it works",
};
const render = (email: Partial<RenderInput["email"]>, nextStep: NextStep = "call") =>
  renderEmail({
    baseUrl: "http://localhost:3000",
    slug: "refresh-renovation",
    brandName: "Refresh Renovation",
    site,
    settings,
    email: { key: "x", subject: "Hello {first_name}", body: "Hi {first_name},\n\nA line about {brand}.", ...email },
    lead: { id: "11111111-1111-1111-1111-111111111111", firstName: "Dana" },
    nextStep,
    sendId: "22222222-2222-2222-2222-222222222222",
  });
const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("the styled layouts", () => {
  it("Header: logo bar with the next-step button, headline, wording, big button, P.S., signature, video box, footer", () => {
    const mail = render({ layout: "header", headline: "A Headline for {first_name}", preview: "The preview line" });
    expect(mail.subject).toBe("Hello Dana");
    expect(mail.html).toContain("The preview line");
    expect(mail.html).toContain("<h1");
    expect(mail.html).toContain("A Headline for Dana");
    expect(mail.html).toContain("A line about Refresh Renovation.");
    // The call to action appears twice: the small header button and the big one.
    expect(count(mail.html, ">Schedule a call</a>")).toBe(2);
    expect(mail.html).toContain("PS. The next step is a short call");
    expect(mail.html).toContain("Mike Smith,");
    expect(mail.html).toContain("07000 000000");
    expect(mail.html).toContain("Have you watched it yet?");
    expect(mail.html).toContain("Mike explains how it works");
    expect(mail.html).toContain(">Unsubscribe</a>");
  });

  it("No header: the same email without the logo bar", () => {
    const mail = render({ layout: "plain", headline: "Funding Available" });
    expect(mail.html).toContain("Funding Available");
    expect(count(mail.html, ">Schedule a call</a>")).toBe(1); // only the big button
    expect(mail.html).toContain("Have you watched it yet?");
  });

  it("Header + video: a thumbnail and a watch button that open the franchisee's video page", () => {
    const mail = render({ layout: "video", headline: "Ali's Story", videoId: "vt1", imageUrl: "https://img.example/ali.jpg" });
    expect(mail.html).toContain('src="https://img.example/ali.jpg"');
    expect(mail.html).toContain("Watch Ali&#39;s Full Story".replace("&#39;", "'"));
    expect(mail.html).toContain(encodeURIComponent("/site/refresh-renovation/video/vt1"));
    expect(mail.text).toContain("Watch Ali's Full Story");
    // Without a thumbnail it still shows something to press.
    expect(render({ layout: "video", videoId: "vt1" }).html).toContain("Ali's story");
    // A video that has not been added to the brand yet is simply left out.
    expect(render({ layout: "video", videoId: "vt9" }).html).not.toContain("Full Story");
  });

  it("Header + owner photo: a large photo under the headline", () => {
    const mail = render({ layout: "owner", headline: "£69,000 in 8 Months", imageUrl: "https://img.example/dave.jpg" });
    expect(mail.html).toContain('src="https://img.example/dave.jpg"');
  });

  it("shows a quote with who said it, bullet lists, and can drop the P.S.", () => {
    const mail = render({
      layout: "header",
      body: "Hi {first_name},\n\n- First point\n- Second point\n\nA last line.",
      quote: "It changed everything.",
      quoteBy: "Ali, Refresh Renovation London",
      showPs: false,
    });
    expect(mail.html).toContain("<ul");
    expect(count(mail.html, "<li")).toBe(2);
    expect(mail.html).toContain("It changed everything.");
    expect(mail.html).toContain("Ali, Refresh Renovation London");
    expect(mail.html).not.toContain("PS. ");
    expect(count(mail.html, ">Schedule a call</a>")).toBe(2); // the buttons stay
  });
});

describe("the personal layout", () => {
  it("reads as typed by the consultant: no logo bar, no headline, no boxes, a link in place of a button", () => {
    const mail = render({ layout: "personal", headline: "Ignored", quote: "Ignored too" });
    expect(mail.html).not.toContain("<h1");
    expect(mail.html).not.toContain("<table");
    expect(mail.html).not.toContain("Have you watched it yet?");
    expect(mail.html).not.toContain("Ignored");
    expect(count(mail.html, ">Schedule a call</a>")).toBe(1);
    expect(mail.html).toContain("Mike Smith");
    expect(mail.html).toContain(">Unsubscribe</a>"); // still there, small
  });
});

describe("the call to action", () => {
  it("follows the lead's next step in every layout", () => {
    const labels: Record<NextStep, string> = {
      prospectus: "Read the prospectus",
      call: "Schedule a call",
      "next-steps": "Read your next steps",
      questions: "See the questions to ask us",
      done: "just reply to this email",
    };
    for (const layout of ["header", "video", "owner", "plain", "personal"]) {
      for (const step of Object.keys(labels) as NextStep[]) {
        const mail = render({ layout }, step);
        expect(mail.html, `${layout} / ${step}`).toContain(labels[step]);
        expect(mail.text, `${layout} / ${step}`).toContain(labels[step]);
      }
    }
  });
});

describe("the starter library", () => {
  it("is the prospectus email, 24 named sequence emails in order, 2 reactions and 4 nudges", () => {
    const of = (kind: string) => starterEmails.filter((e) => e.kind === kind);
    expect(of("prospectus")).toHaveLength(1);
    expect(of("sequence").map((e) => e.name)).toEqual([
      "VT1 Short", "VT2 Short", "Funding", "Marketing 1", "VT3 Short", "VT4 Short", "VT5 Short", "Training",
      "Marketing 2", "UC1", "Day in the Life", "VT1 Long", "Support", "UC2", "Territory", "VT2 Long",
      "Marketing 3", "UC3", "Questions", "VT3 Long", "Next Steps", "UC4", "Why Now", "Book a Call",
    ]);
    expect(of("reaction")).toHaveLength(2);
    expect(of("nudge")).toHaveLength(4);
    expect(new Set(starterEmails.map((e) => e.key)).size).toBe(starterEmails.length);
    // Testimonials use the video layout, Funding has no header, reactions and nudges are personal.
    expect(starterEmails.find((e) => e.name === "VT1 Short")).toMatchObject({ layout: "video", videoId: "vt1" });
    expect(starterEmails.find((e) => e.name === "Funding")?.layout).toBe("plain");
    expect([...of("reaction"), ...of("nudge")].every((e) => e.layout === "personal")).toBe(true);
  });
});
