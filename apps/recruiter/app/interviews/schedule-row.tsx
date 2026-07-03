"use client";

import { useActionState, useState } from "react";
import { cancelSchedule, logOutcome, type OutcomeState } from "./actions";

const STATUS_STYLE: Record<string, string> = {
  PROPOSED: "text-warning bg-warning/12",
  ACCEPTED: "text-success bg-success/12",
  DECLINED: "text-danger bg-danger/12",
  RESCHEDULE_REQUESTED: "text-cyan bg-cyan/12",
  CANCELED: "text-faint bg-surface",
  COMPLETED: "text-muted bg-surface",
};

export function ScheduleRow({
  id,
  status,
  proposedAt,
}: {
  id: string;
  status: string;
  proposedAt: number;
}) {
  const [state, action, pending] = useActionState<OutcomeState, FormData>(logOutcome.bind(null, id), {});
  const [showOutcome, setShowOutcome] = useState(false);

  const canCancel = status === "PROPOSED" || status === "RESCHEDULE_REQUESTED";
  // Date.now() is impure — read it once via lazy init, not directly during render.
  const [isPast] = useState(() => proposedAt < Date.now());
  const canLogOutcome = isPast && status !== "COMPLETED" && status !== "CANCELED" && status !== "DECLINED";

  if (state.saved) return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE.COMPLETED}`}>Outcome logged</span>;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status] ?? ""}`}>{status.replace(/_/g, " ")}</span>
      <div className="flex gap-2">
        {canCancel ? (
          <button
            type="button"
            onClick={() => cancelSchedule(id)}
            className="text-[11px] font-semibold text-danger hover:underline"
          >
            Cancel
          </button>
        ) : null}
        {canLogOutcome ? (
          <button type="button" onClick={() => setShowOutcome((v) => !v)} className="text-[11px] font-semibold text-cyan hover:underline">
            Log outcome
          </button>
        ) : null}
      </div>
      {showOutcome ? (
        <form action={action} className="mt-1 flex w-[220px] flex-col gap-1.5 rounded-xl border border-line bg-surface p-2.5">
          <select name="outcome" required className="rounded-lg border border-line-strong bg-card px-2 py-1.5 text-[12px] text-ink">
            <option value="">Outcome…</option>
            <option value="SELECTED">Selected</option>
            <option value="REJECTED">Rejected</option>
            <option value="ON_HOLD">On hold</option>
          </select>
          <textarea name="outcomeNote" rows={2} placeholder="Notes (optional)" className="resize-none rounded-lg border border-line-strong bg-card px-2 py-1.5 text-[12px] text-ink placeholder:text-faint" />
          {state.error ? <p className="text-[11px] text-danger">{state.error}</p> : null}
          <button type="submit" disabled={pending} className="rounded-lg bg-cyan px-2 py-1.5 text-[11.5px] font-semibold text-on-accent disabled:opacity-60">
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
