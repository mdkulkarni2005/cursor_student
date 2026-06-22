"use client";

import { createPortal, useFormStatus } from "react-dom";
import { Spinner } from "@/components/ui/button";

/**
 * A full-screen blocking overlay shown while the parent <form>'s server action is pending. Drop it
 * INSIDE a heavy form (`<GeneratingOverlay label="…" />`) — it reads the form's status via
 * `useFormStatus`, so it works for both `useActionState` forms and plain `action={serverAction}`
 * forms. It blocks the screen (prevents double-submits) until the action resolves / navigates away.
 */
export function GeneratingOverlay({
  label = "Generating your document…",
  sub = "This takes a few moments — please keep this tab open.",
}: {
  label?: string;
  sub?: string;
}) {
  const { pending } = useFormStatus();
  if (!pending || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="alertdialog"
      aria-busy="true"
      aria-label={label}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-canvas/85 backdrop-blur-sm"
    >
      <span className="text-[34px] text-cyan">
        <Spinner />
      </span>
      <div className="px-6 text-center">
        <p className="font-display text-[17px] font-semibold text-ink">{label}</p>
        <p className="mt-1.5 text-[13.5px] text-muted">{sub}</p>
      </div>
    </div>,
    document.body,
  );
}
