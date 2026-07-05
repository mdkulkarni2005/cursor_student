"use client";

import { useActionState } from "react";
import { scheduleInterview, type ScheduleState } from "@/app/interviews/actions";

export function ScheduleForm({ studentId, jobPostingId }: { studentId: string; jobPostingId?: string }) {
  const [state, action, pending] = useActionState<ScheduleState, FormData>(scheduleInterview.bind(null, studentId), {});

  if (state.scheduled) {
    return <p className="rounded-xl border border-success/30 bg-success/10 px-3.5 py-2.5 text-[13px] text-success">Interview proposed — the student will see it and can accept, decline, or suggest another time.</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-2.5">
      {jobPostingId ? <input type="hidden" name="jobPostingId" value={jobPostingId} /> : null}
      <div>
        <label htmlFor="proposedAt" className="mb-1 block text-[11.5px] font-semibold text-muted">Date &amp; time</label>
        <input
          id="proposedAt"
          name="proposedAt"
          type="datetime-local"
          required
          className="w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:border-cyan/50"
        />
      </div>
      <div>
        <label htmlFor="meetingLink" className="mb-1 block text-[11.5px] font-semibold text-muted">Meeting link (optional)</label>
        <input
          id="meetingLink"
          name="meetingLink"
          type="url"
          placeholder="https://meet.google.com/…"
          className="w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-faint focus:border-cyan/50"
        />
        <p className="mt-1 text-[11px] text-faint">Paste your own Zoom/Meet/Teams link — can also be added later.</p>
      </div>
      <div>
        <label htmlFor="note" className="mb-1 block text-[11.5px] font-semibold text-muted">Note (optional)</label>
        <textarea
          id="note"
          name="note"
          rows={2}
          placeholder="e.g. 30 min, backend round"
          className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-faint focus:border-cyan/50"
        />
      </div>
      {state.error ? <p className="text-[12px] text-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-end rounded-xl bg-cyan px-4 py-2 text-[13px] font-semibold text-on-accent hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Proposing…" : "Propose interview"}
      </button>
    </form>
  );
}
