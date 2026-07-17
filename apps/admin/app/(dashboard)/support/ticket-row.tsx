"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateTicket } from "./actions";

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

const STATUS_STYLE: Record<string, string> = {
  OPEN: "text-warning bg-warning/12",
  IN_PROGRESS: "text-cyan bg-cyan/12",
  RESOLVED: "text-success bg-success/12",
  CLOSED: "text-muted bg-surface",
};

function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function TicketRow({
  id,
  from,
  correctiveActionHref,
  subject,
  message,
  status,
  adminNote,
  createdAt,
}: {
  id: string;
  from: string;
  correctiveActionHref: string | null;
  subject: string;
  message: string;
  status: string;
  adminNote: string | null;
  createdAt: Date;
}) {
  const [isPending, startTransition] = useTransition();
  const [nextStatus, setNextStatus] = useState(status);
  const [note, setNote] = useState(adminNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateTicket(id, nextStatus, note);
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[15.5px] font-semibold text-ink">{subject}</p>
          <p className="mt-0.5 text-[13.5px] text-muted">
            {from} · {fmtDateTime(createdAt)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold ${STATUS_STYLE[status]}`}>
          {status.replace("_", " ")}
        </span>
      </div>

      <p className="mt-2.5 whitespace-pre-wrap text-[15px] text-soft">{message}</p>

      {correctiveActionHref ? (
        <Link href={correctiveActionHref} className="mt-2 inline-block text-[14px] font-semibold text-cyan hover:underline">
          Open account →
        </Link>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <select
          value={nextStatus}
          onChange={(e) => setNextStatus(e.target.value)}
          className="rounded-lg border border-line bg-input px-2 py-1.5 text-[14px] text-ink"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Response visible to the requester (optional)"
          className="min-w-[220px] flex-1 rounded-lg border border-line bg-input px-2.5 py-1.5 text-[14px] text-ink placeholder:text-faint"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={onSave}
          className="rounded-lg bg-cyan px-3 py-1.5 text-[14px] font-semibold text-on-accent disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {saved && !isPending ? <span className="text-[13px] text-success">Saved.</span> : null}
        {error ? <span className="text-[13px] text-danger">{error}</span> : null}
      </div>
    </div>
  );
}
