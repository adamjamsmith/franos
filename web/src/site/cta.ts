/**
 * The one button repeated down a public page. It always asks for the visitor's next step:
 * download the prospectus, then schedule a call, then download Next steps (the questions are on that page).
 */
export type Cta = { label: string; href: string };

/** What franOS knows a lead has done. `null` means a visitor who has not filled in the form. */
export type Progress = { prospectus: boolean; call: boolean } | null;

export function ctaFor(slug: string, progress: Progress, links: { signUp?: string; book?: string } = {}): Cta {
  if (!progress) return { label: "Download the prospectus", href: links.signUp ?? `/site/${slug}#sign-up` };
  if (!progress.prospectus) return { label: "Download the prospectus", href: `/site/${slug}/prospectus` };
  if (!progress.call) return { label: "Schedule a call", href: links.book ?? `/site/${slug}/thank-you#book` };
  return { label: "Download next steps", href: `/site/${slug}/next-steps` };
}
