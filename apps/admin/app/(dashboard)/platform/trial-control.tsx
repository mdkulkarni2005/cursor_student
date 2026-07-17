"use client";

import { useState, useTransition } from "react";
import { updateGlobalTrial } from "./actions";

export function TrialControl({
  initialEnabled,
  initialDays,
  initialPlanTierId,
  studentTiers,
}: {
  initialEnabled: boolean;
  initialDays: number;
  initialPlanTierId: string | null;
  studentTiers: { id: string; name: string }[];
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [days, setDays] = useState(initialDays);
  const [planTierId, setPlanTierId] = useState(initialPlanTierId ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateGlobalTrial({ enabled, days, planTierId: planTierId || null });
        setSaved(true);
      } catch {
        setError("Failed to save.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4 sm:col-span-2">
      <p className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-faint">Trial &amp; promo</p>
      <p className="mb-3 text-[13px] text-faint">
        Controls the platform-wide free promo (e.g. &quot;everyone free for 2 months&quot;). While enabled, every new
        signup gets the given number of days on the selected plan tier before falling back to the default free tier
        — existing users are never affected. Turn it off to end the promo for new signups going forward.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[14.5px] text-soft">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Trial enabled
        </label>
        <label className="flex items-center gap-2 text-[14.5px] text-soft">
          Days
          <input
            type="number"
            min={0}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-20 rounded-lg border border-line bg-surface px-2 py-1.5 text-[15px] text-ink"
          />
        </label>
        <label className="flex items-center gap-2 text-[14.5px] text-soft">
          Trial plan
          <select
            value={planTierId}
            onChange={(e) => setPlanTierId(e.target.value)}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[15px] text-ink"
          >
            <option value="">— none —</option>
            {studentTiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
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
