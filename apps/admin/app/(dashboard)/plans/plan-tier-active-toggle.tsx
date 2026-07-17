"use client";

import { useTransition } from "react";
import { setPlanTierActive } from "./actions";

export function PlanTierActiveToggle({ id, active }: { id: string; active: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => setPlanTierActive(id, !active))}
      className={`rounded-lg border px-2.5 py-1 text-[13.5px] font-semibold disabled:opacity-50 ${
        active ? "border-danger/40 text-danger hover:bg-danger/10" : "border-success/40 text-success hover:bg-success/10"
      }`}
    >
      {active ? "Archive" : "Activate"}
    </button>
  );
}
