"use client";

import { useState } from "react";

/**
 * A button that copies a link and says so. `path` is a page on this franOS (its address is added in the
 * browser); `url` is a full address, such as a Zoom link. With `text` the button shows a word beside the icon.
 */
export function CopyLink({ path, url, label, text, className }: { path?: string; url?: string; label: string; text?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const address = url ?? `${window.location.origin}${path ?? ""}`;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link", address);
    }
  };
  const look = text
    ? `inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium ${
        copied
          ? "border-green-600 bg-green-600 text-white"
          : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      }`
    : `flex h-7 w-7 items-center justify-center rounded-md ${
        copied ? "text-green-600" : "text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      }`;
  return (
    <button type="button" onClick={copy} aria-label={label} title={copied ? "Copied" : label} className={`${look} ${className ?? ""}`}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {copied ? <path d="M5 12.500l4.500 4.500L19 7.500" /> : <path d="M9 9h10v11H9zM5 15V4h10" />}
      </svg>
      {text && <span>{copied ? "Copied" : text}</span>}
    </button>
  );
}
