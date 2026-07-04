"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { acceptSchedule, declineSchedule, proposeReschedule, type ProposeReschedulState } from "@/lib/actions/interview-schedule";

export function ScheduleResponse({
  id,
  status,
  proposedAt,
  joinWindow,
}: {
  id: string;
  status: string;
  proposedAt: Date;
  joinWindow: "joinable" | "too-early" | "expired" | "not-accepted";
}) {
  const [pending, start] = useTransition();
  const [showReschedule, setShowReschedule] = useState(false);
  const [state, action, actionPending] = useActionState<ProposeReschedulState, FormData>(proposeReschedule.bind(null, id), {});

  if (status === "ACCEPTED") return <LaunchPanel proposedAt={proposedAt} joinWindow={joinWindow} />;
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

/** Shown once the student has accepted, in place of the accept/decline buttons — the interview
 *  runs on a plain authenticated page, so this just links there. Outside the join window (more
 *  than 15 min before, or more than 7 hours after, the scheduled time) the button is replaced with
 *  a specific reason instead of either a dead link or a silently-vanished button. */
function LaunchPanel({
  proposedAt,
  joinWindow,
}: {
  proposedAt: Date;
  joinWindow: "joinable" | "too-early" | "expired" | "not-accepted";
}) {
  const when = new Date(proposedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="mt-2.5 rounded-xl border border-line-strong bg-surface p-3">
      <p className="text-[12.5px] text-soft">
        Interview confirmed for {when}. Camera and microphone are required for the whole call.
      </p>
      {joinWindow === "joinable" ? (
        <Link
          href="/real-interview"
          className="mt-2 inline-block rounded-lg bg-cyan px-3 py-1.5 text-[11.5px] font-semibold text-on-accent"
        >
          Join interview
        </Link>
      ) : joinWindow === "too-early" ? (
        <p className="mt-2 text-[11.5px] text-faint">The join button appears 15 minutes before {when}.</p>
      ) : (
        <p className="mt-2 text-[11.5px] text-faint">This interview&rsquo;s join window has passed.</p>
      )}
    </div>
  );
}
