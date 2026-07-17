"use client";

import { useState, useTransition } from "react";
import { updateMaxMonthlyAiCostCents } from "./actions";

export function CostCapControl({ initialCents }: { initialCents: number }) {
  const [value, setValue] = useState((initialCents / 100).toFixed(2));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSave() {
    setError(null);
    setSaved(false);
    const dollars = Number(value);
    if (!Number.isFinite(dollars) || dollars < 0) {
      setError("Enter a valid amount.");
      return;
    }
    startTransition(async () => {
      try {
        await updateMaxMonthlyAiCostCents(Math.round(dollars * 100));
        setSaved(true);
      } catch {
        setError("Failed to save.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-faint">Max AI spend per user / month</p>
      <p className="mb-3 text-[13px] text-faint">
        Hard $ backstop — once a student&apos;s tracked AI spend this month hits this amount, every AI-cost action
        (reports, PPT, résumé, mock interview, DSA hints, etc.) is blocked until the 1st, regardless of any
        per-feature quota. Protects against one account running up the Gateway bill.
      </p>
      <div className="flex items-center gap-2">
        <span className="text-[15px] text-soft">$</span>
        <input
          type="number"
          min={0}
          step={0.5}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-24 rounded-lg border border-line bg-surface px-2 py-1.5 text-[15px] text-ink"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={onSave}
          className="rounded-lg border border-line px-3 py-1.5 text-[14px] font-semibold text-soft transition hover:bg-surface disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {saved && !isPending && <span className="text-[13.5px] text-success">Saved.</span>}
        {error && <span className="text-[13.5px] text-danger">{error}</span>}
      </div>
    </div>
  );
}
