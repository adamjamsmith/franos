/**
 * Spam protection for the public form.
 * A hidden trap field is always checked (see registerLead). When Cloudflare Turnstile keys are set,
 * the Turnstile check runs as well. On this computer no keys are set, so only the trap field runs.
 */
export const turnstileSiteKey = () => process.env.TURNSTILE_SITE_KEY ?? "";

export async function passesTurnstile(token: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
