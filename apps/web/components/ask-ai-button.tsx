"use client";

/** Opens the always-on assistant panel (it listens for this event in app-shell). */
export function AskAiButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("krackit:assistant-open", { detail: {} }))}
      className={className}
    >
      {children}
    </button>
  );
}
