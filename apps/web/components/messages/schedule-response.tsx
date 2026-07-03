"use client";

import { useActionState, useState, useTransition } from "react";
import { acceptSchedule, declineSchedule, proposeReschedule, type ProposeReschedulState } from "@/lib/actions/interview-schedule";

export function ScheduleResponse({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [showReschedule, setShowReschedule] = useState(false);
  const [state, action, actionPending] = useActionState<ProposeReschedulState, FormData>(proposeReschedule.bind(null, id), {});

  if (status !== "PROPOSED") return null;
  if (state.sent) return <p className="mt-2 text-[12px] text-cyan">Sent — the recruiter will see your suggested time.</p>;

  return (
    <div className="mt-2.5">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => acceptSchedule(id))}
          className="rounded-lg bg-success/15 px-3 py-1.5 text-[11.5px] font-semibold text-success hover:bg-success/25 disabled:opacity-50"
        >
          Accept
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setShowReschedule((v) => !v)}
          className="rounded-lg border border-line-strong px-3 py-1.5 text-[11.5px] font-semibold text-soft hover:bg-surface disabled:opacity-50"
        >
          Suggest another time
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => declineSchedule(id))}
          className="rounded-lg bg-danger/10 px-3 py-1.5 text-[11.5px] font-semibold text-danger hover:bg-danger/20 disabled:opacity-50"
        >
          Decline
        </button>
      </div>
      {showReschedule ? (
        <form action={action} className="mt-2 flex flex-col gap-1.5">
          <textarea
            name="studentNote"
            rows={2}
            placeholder="e.g. Can we do Thursday 5pm instead?"
            className="w-full resize-none rounded-lg border border-line-strong bg-surface px-3 py-2 text-[12.5px] text-ink placeholder:text-faint"
          />
          {state.error ? <p className="text-[11px] text-danger">{state.error}</p> : null}
          <button type="submit" disabled={actionPending} className="self-start rounded-lg bg-cyan px-3 py-1.5 text-[11.5px] font-semibold text-on-accent disabled:opacity-60">
            {actionPending ? "Sending…" : "Send suggestion"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
