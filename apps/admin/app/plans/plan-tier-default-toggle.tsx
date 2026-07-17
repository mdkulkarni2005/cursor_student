"use client";

import { useTransition } from "react";
import { setDefaultFreeTier } from "./actions";

/** "Make default" button for a non-free tier — becomes a static badge once it's the audience's
 *  single default free plan (see setDefaultFreeTier, which unmarks every other tier). */
export function PlanTierDefaultToggle({ id, isFree }: { id: string; isFree: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (isFree) {
    return <span className="rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-semibold text-success">Default free plan</span>;
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => setDefaultFreeTier(id))}
      className="rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-semibold text-soft hover:bg-surface disabled:opacity-50"
    >
      Make default
    </button>
  );
}
