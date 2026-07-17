"use client";

import { useState, useTransition } from "react";
import { updateMaxConcurrentSessions } from "./actions";

export function SessionLimitControl({ initial }: { initial: number }) {
  const [value, setValue] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateMaxConcurrentSessions(value);
        setSaved(true);
      } catch {
        setError("Failed to save.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-faint">Max concurrent sessions</p>
      <p className="mb-3 text-[13px] text-faint">
        Devices a single account can be logged into at once. New sign-ins beyond this kick the oldest session
        (anti account-sharing). Default 1.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={20}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-20 rounded-lg border border-line bg-surface px-2 py-1.5 text-[15px] text-ink"
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
