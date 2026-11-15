import { describe, expect, it } from "vitest";
import { defaultSite, siteFor } from "../src/site/config";
import { ctaFor } from "../src/site/cta";

describe("the button on the public pages", () => {
  it("sends a visitor who has not signed up to the form", () => {
    expect(ctaFor("acme", null)).toEqual({ label: "Download the prospectus", href: "/site/acme#sign-up" });
    expect(ctaFor("acme", null, { signUp: "#sign-up" })).toEqual({ label: "Download the prospectus", href: "#sign-up" });
  });

  it("asks a lead for their next step: prospectus, then a call, then Next steps", () => {
    expect(ctaFor("acme", { prospectus: false, call: false })).toEqual({ label: "Download the prospectus", href: "/site/acme/prospectus" });
    expect(ctaFor("acme", { prospectus: true, call: false })).toEqual({ label: "Schedule a call", href: "/site/acme/thank-you#book" });
    expect(ctaFor("acme", { prospectus: true, call: false }, { book: "#book" })).toEqual({ label: "Schedule a call", href: "#book" });
    expect(ctaFor("acme", { prospectus: true, call: true })).toEqual({ label: "Download next steps", href: "/site/acme/next-steps" });
  });

  it("asks for the prospectus first even when a call is already booked", () => {
    expect(ctaFor("acme", { prospectus: false, call: true }).label).toBe("Download the prospectus");
  });
});

describe("proof images", () => {
  it("a brand starts with placeholder boxes that say what will go there, and keeps the ones it saves", () => {
    const starter = defaultSite("Acme").proofImages;
    expect(starter.length).toBeGreaterThan(3);
    expect(starter.every((image) => image.url === "" && Boolean(image.caption))).toBe(true);
    expect(siteFor({ name: "Acme", site: {} }).proofImages).toEqual(starter);
    const saved = siteFor({ name: "Acme", site: { proofImages: [{ url: "/a.png", caption: "Year one" }] } });
    expect(saved.proofImages).toEqual([{ url: "/a.png", caption: "Year one" }]);
    expect(siteFor({ name: "Acme", site: { proofImages: [] } }).proofImages).toEqual([]);
  });
});

describe("the starter homepage", () => {
  it("has three ticks, three placeholder testimonials, and a footer note about earnings", () => {
    const site = defaultSite("Acme");
    expect(site.ticks).toEqual(["Marketing done for you", "Full funding available", "No experience required"]);
    expect(site.videos.map((v) => v.person)).toEqual(["A franchisee", "B franchisee", "C franchisee"]);
    expect(site.earningsNote).toMatch(/projections based on the performance of existing franchisees/);
    expect(site.earningsNote).toMatch(/not a guarantee/);
  });
});
