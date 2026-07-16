"use client";

import { useState, useTransition } from "react";
import { updatePaymentsEnabled } from "./actions";

export function PaymentsControl({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onToggle(next: boolean) {
    setEnabled(next);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updatePaymentsEnabled(next);
        setSaved(true);
      } catch {
        setEnabled(!next);
        setError("Failed to save.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4 sm:col-span-2">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">Payments</p>
      <p className="mb-3 text-[11px] text-faint">
        Turns real Razorpay checkout on or off for both students (apps/web) and recruiters (apps/recruiter). While
        off, paid plans still show pricing but checkout is unavailable — pricing pages, manual admin plan grants,
        and free-tier signup are unaffected either way.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[12.5px] text-soft">
          <input type="checkbox" checked={enabled} disabled={isPending} onChange={(e) => onToggle(e.target.checked)} />
          Payments live
        </label>
        {isPending && <span className="text-[11.5px] text-faint">Saving…</span>}
        {saved && !isPending && <span className="text-[11.5px] text-success">Saved.</span>}
        {error && <span className="text-[11.5px] text-danger">{error}</span>}
      </div>
    </div>
  );
}
