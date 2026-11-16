"use client";

import type { ReactNode } from "react";

/** A submit button that asks "are you sure?" first. For things that cannot be undone. */
export function ConfirmButton({ question, label, className, children }: { question: string; label: string; className?: string; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={className}
      onClick={(event) => {
        if (!window.confirm(question)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
