"use client";

import { useState, useTransition } from "react";
import { revokeUserSession } from "./actions";
import type { SessionSummary } from "@/lib/sessions";

function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function SessionsPanel({ userId, sessions, error }: { userId: string; sessions: SessionSummary[]; error?: string }) {
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function onRevoke(sessionId: string) {
    setLocalError(null);
    setBusyId(sessionId);
    startTransition(async () => {
      try {
        await revokeUserSession(userId, sessionId);
      } catch {
        setLocalError("Failed to revoke session.");
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-faint">
        Active devices ({sessions.length})
      </p>
      {error ? (
        <p className="text-[13px] text-danger">{error}</p>
      ) : sessions.length === 0 ? (
        <p className="text-[13px] text-faint">No active sessions.</p>
      ) : (
        <ul className="space-y-2 text-[13px]">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 border-b border-line/60 pb-2 last:border-0 last:pb-0">
              <div>
                <p className="text-ink">
                  {s.browserName ?? "Unknown browser"} {s.isMobile ? "(mobile)" : ""} {s.deviceType ? `· ${s.deviceType}` : ""}
                </p>
                <p className="text-[11px] text-faint">
                  {[s.city, s.country].filter(Boolean).join(", ") || s.ipAddress || "Unknown location"} · last active {fmtDateTime(s.lastActiveAt)}
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => onRevoke(s.id)}
                className="shrink-0 rounded-lg border border-danger/40 px-2.5 py-1 text-[11.5px] font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-50"
              >
                {busyId === s.id ? "…" : "Log out"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {localError && <p className="mt-2 text-[11.5px] text-danger">{localError}</p>}
    </div>
  );
}
