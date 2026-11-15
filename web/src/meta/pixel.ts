import type { SiteContent } from "../site/config";
import { coversCookies } from "./click";
import { metaSettingsFor } from "./send";

export { coversCookies };

/**
 * Meta's browser pixel sets advertising cookies, so it only ever loads for someone who agreed to that.
 * It is never on a page for a new visitor: they have not been asked yet.
 */

export type PixelViewer = {
  /** The signed-up lead this browser belongs to, if any. */
  leadId: string | null;
  /** They ticked a consent box whose wording covers cookies. */
  agreedToCookies: boolean;
  /** Someone at franOS looking at the pages as a lead, or simply signed in. Never tracked. */
  staff: boolean;
};

/**
 * Whether the pixel loads on this page, and for which dataset.
 * - The brand needs a dataset, and must be live or have a test code (before go-live that means a test dataset).
 * - The visitor must be a lead who agreed to cookies. Staff are never tracked.
 */
export function pixelFor(site: SiteContent, viewer: PixelViewer): { datasetId: string; leadId: string } | null {
  const settings = metaSettingsFor(site);
  if (!settings || (!settings.live && settings.testCode === "")) return null;
  if (!viewer.leadId || !viewer.agreedToCookies || viewer.staff) return null;
  return { datasetId: settings.datasetId, leadId: viewer.leadId };
}
