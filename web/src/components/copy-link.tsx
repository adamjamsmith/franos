"use client";

import { useState } from "react";

/** A small icon that copies a link. The link is the path; the address of this franOS is added in the browser. */
export function CopyLink({ path, label }: { path: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const address = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link", address);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy the ${label} booking link`}
      title={copied ? "Copied" : `Copy the ${label} booking link`}
      className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {copied ? <path d="M5 12.5l4.500 4.500L19 7.500" /> : <path d="M9 9h10v11H9zM5 15V4h10" />}
      </svg>
    </button>
  );
}
