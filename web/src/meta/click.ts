/**
 * Small rules about Meta's click code and cookies. Kept on their own, with no other code pulled in,
 * so the sign-up and the pixel can both use them.
 */

/** Does the wording a lead ticked say anything about cookies? Only then may the pixel load for them. */
export const coversCookies = (wording: string) => /\bcookies?\b/i.test(wording);

/** The click code Meta adds to an ad's link (`fbclid`), in the form Meta wants it back. Null if it is not one. */
export function clickCode(fbclid: string | undefined | null, at: Date = new Date()): string | null {
  const value = (fbclid ?? "").trim();
  return /^[A-Za-z0-9_-]{8,500}$/.test(value) ? `fb.1.${at.getTime()}.${value}` : null;
}

/** Meta's own browser cookie (`_fbp`), if it looks like one. */
export const browserId = (value: string | undefined | null) => (/^fb\.\d\.\d{6,}\.\d{3,}$/.test(value ?? "") ? (value as string) : null);
