"use client";

import { useState, useTransition } from "react";
import { approveRecruiter, rejectRecruiter } from "./actions";

export function RecruiterRow({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onApprove() {
    setError(null);
    startTransition(async () => {
      try {
        await approveRecruiter(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to approve.");
      }
    });
  }

  function onReject() {
    if (!rejecting) {
      setRejecting(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await rejectRecruiter(id, note);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reject.");
      }
    });
  }

  if (rejecting) {
    return (
      <div className="flex flex-col gap-1.5">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason (optional)"
          className="rounded-lg border border-line bg-input px-2 py-1 text-[13.5px] text-ink placeholder:text-faint"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={onReject}
            className="rounded-lg border border-danger bg-danger px-2.5 py-1 text-[13.5px] font-semibold text-on-accent disabled:opacity-50"
          >
            Confirm reject
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setRejecting(false)}
            className="rounded-lg border border-line px-2.5 py-1 text-[13.5px] font-semibold text-soft hover:bg-surface"
          >
            Cancel
          </button>
        </div>
        {error && <span className="text-[13px] text-danger">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={onApprove}
        className="rounded-lg border border-success/40 px-2.5 py-1 text-[13.5px] font-semibold text-success hover:bg-success/10 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={onReject}
        className="rounded-lg border border-danger/40 px-2.5 py-1 text-[13.5px] font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
      >
        Reject
      </button>
      {error && <span className="text-[13px] text-danger">{error}</span>}
    </div>
  );
}
