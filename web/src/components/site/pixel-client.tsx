"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

/**
 * Loads Meta's pixel and reports each page the lead looks at. Only ever rendered for a lead who agreed to cookies.
 * On the thank-you page it also reports the sign-up, with the same id the server uses, so Meta counts it once.
 */
export function PixelClient({ datasetId, leadId }: { datasetId: string; leadId: string }) {
  const path = usePathname();

  useEffect(() => {
    const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq };
    if (!w.fbq) {
      const fbq: Fbq = (...args: unknown[]) => {
        if (fbq.callMethod) fbq.callMethod(...args);
        else fbq.queue?.push(args);
      };
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.queue = [];
      w.fbq = fbq;
      w._fbq = fbq;
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
      fbq("init", datasetId, { external_id: leadId });
    }
    w.fbq("track", "PageView");

    if (path.endsWith("/thank-you")) {
      const key = `franos_lead_reported_${leadId}`;
      let already = false;
      try {
        already = window.localStorage.getItem(key) === "1";
        window.localStorage.setItem(key, "1");
      } catch {
        already = false;
      }
      if (!already) w.fbq("track", "Lead", {}, { eventID: `lead-${leadId}` });
    }
  }, [path, datasetId, leadId]);

  return null;
}
