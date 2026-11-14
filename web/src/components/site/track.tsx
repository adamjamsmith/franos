"use client";

import { useEffect, useRef } from "react";
import type { TrackEvent } from "@/site/track";

/** Sends an activity report to franOS. Stores nothing in the browser. */
export function track(slug: string, event: TrackEvent) {
  const body = JSON.stringify({ slug, event });
  if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
  void fetch("/api/track", { method: "POST", body, keepalive: true });
}

/** Reports one event when the page opens. */
export function Beacon({ slug, event }: { slug: string; event: TrackEvent }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(slug, event);
  }, [slug, event]);
  return null;
}

const MILESTONES = [25, 50, 75, 95];

/** A video that reports when it is played and how far it is watched. */
export function TrackedVideo({ slug, videoId, src, title }: { slug: string; videoId: string; src: string; title: string }) {
  const started = useRef(false);
  const reached = useRef(0);

  const report = (video: HTMLVideoElement, percent: number) =>
    track(slug, { type: "video_progress", videoId, percent, seconds: Math.round(video.currentTime) });

  return (
    <video
      className="aspect-video w-full rounded-lg bg-black"
      controls
      playsInline
      preload="metadata"
      src={src}
      title={title}
      onPlay={(e) => {
        if (started.current) return;
        started.current = true;
        report(e.currentTarget, 0);
      }}
      onTimeUpdate={(e) => {
        const video = e.currentTarget;
        if (!video.duration) return;
        const percent = (video.currentTime / video.duration) * 100;
        const next = MILESTONES.find((m) => m > reached.current && percent >= m);
        if (next) {
          reached.current = next;
          report(video, next);
        }
      }}
      onEnded={(e) => {
        if (reached.current < 100) {
          reached.current = 100;
          report(e.currentTarget, 100);
        }
      }}
    />
  );
}
