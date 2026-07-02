"use client";

import { useState, useTransition } from "react";
import { setUserPlan } from "./actions";

const PLANS = ["FREE", "PRO", "PREMIUM"] as const;

export function PlanSelector({ userId, plan }: { userId: string; plan: string }) {
  const [current, setCurrent] = useState(plan);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(next: string) {
    setError(null);
    const prev = current;
    setCurrent(next);
    startTransition(async () => {
      try {
        await setUserPlan(userId, next);
      } catch {
        setCurrent(prev);
        setError("Failed to update plan.");
      }
    });
  }

  return (
    <div>
      <div className="flex gap-1.5">
        {PLANS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={isPending}
            onClick={() => onChange(p)}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition disabled:opacity-50 ${
              current === p
                ? "border-cyan bg-cyan text-on-accent"
                : "border-line text-soft hover:bg-surface"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      {error && <p className="mt-1.5 text-[11.5px] text-danger">{error}</p>}
      <p className="mt-1.5 text-[11px] text-faint">Manual override — no payment gateway wired up yet.</p>
    </div>
  );
}
