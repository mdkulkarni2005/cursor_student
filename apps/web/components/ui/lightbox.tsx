"use client";

import { useEffect, useState } from "react";

/**
 * Click-to-fullscreen wrapper — the diagrams/images shown inline are small (a card in a grid),
 * so this lets a student open any of them large enough to actually read. `trigger` is the small
 * inline version; `children` is what's shown fullscreen (usually the same content, scaled up).
 */
export function Lightbox({ trigger, children, label }: { trigger: React.ReactNode; children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full cursor-zoom-in text-left"
        aria-label={label ? `Expand: ${label}` : "Expand"}
      >
        {trigger}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/92 p-4 sm:p-8"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between pb-3">
            {label ? <p className="text-[13px] font-semibold text-white/90">{label}</p> : <span />}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-white/20"
            >
              ✕ Close
            </button>
          </div>
          <div className="flex-1 overflow-auto" onClick={(e) => e.stopPropagation()}>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
