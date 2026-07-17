"use client";

import { useState, useTransition } from "react";
import { setRecruiterPlanTier } from "../actions";

export type PlanTierOption = { id: string; name: string; isFree: boolean };

/** Recruiter-side mirror of apps/admin/app/(dashboard)/users/[id]/plan-tier-picker.tsx — shows
 *  every active RECRUITER tier admin has created, plus a "Default (free)" option that clears the
 *  manual grant. Disabled while an ACTIVE paid RecruiterSubscription governs the recruiter. */
export function PlanTierPicker({
  recruiterId,
  tiers,
  currentTierId,
  locked,
  lockedTierName,
}: {
  recruiterId: string;
  tiers: PlanTierOption[];
  currentTierId: string | null;
  locked: boolean;
  lockedTierName?: string | null;
}) {
  const [current, setCurrent] = useState(currentTierId);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(next: string | null) {
    setError(null);
    const prev = current;
    setCurrent(next);
    startTransition(async () => {
      try {
        await setRecruiterPlanTier(recruiterId, next);
      } catch {
        setCurrent(prev);
        setError("Failed to update plan.");
      }
    });
  }

  if (locked) {
    return (
      <div className="text-right">
        <span className="rounded-lg border border-line px-3 py-1.5 text-[14px] font-semibold text-soft">
          {lockedTierName ?? "Active subscription"}
        </span>
        <p className="mt-1.5 text-[13px] text-faint">Managed by an active paid subscription — manual grant disabled.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap justify-end gap-1.5">
        <button
          type="button"
          disabled={isPending}
          onClick={() => onChange(null)}
          className={`rounded-lg border px-3 py-1.5 text-[14px] font-semibold transition disabled:opacity-50 ${
            current === null ? "border-cyan bg-cyan text-on-accent" : "border-line text-soft hover:bg-surface"
          }`}
        >
          Default (free)
        </button>
        {tiers.map((tier) => (
          <button
            key={tier.id}
            type="button"
            disabled={isPending}
            onClick={() => onChange(tier.id)}
            className={`rounded-lg border px-3 py-1.5 text-[14px] font-semibold transition disabled:opacity-50 ${
              current === tier.id ? "border-cyan bg-cyan text-on-accent" : "border-line text-soft hover:bg-surface"
            }`}
          >
            {tier.name}
          </button>
        ))}
      </div>
      {error && <p className="mt-1.5 text-right text-[13.5px] text-danger">{error}</p>}
      <p className="mt-1.5 text-right text-[13px] text-faint">Manual grant — takes effect immediately, everywhere.</p>
    </div>
  );
}
