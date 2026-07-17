"use client";

import { useState, useTransition } from "react";
import { setRecruiterSuspended } from "../actions";

export function AccountOps({ recruiterId, suspended }: { recruiterId: string; suspended: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onToggle() {
    setError(null);
    startTransition(async () => {
      try {
        await setRecruiterSuspended(recruiterId, !suspended);
      } catch {
        setError("Failed to update account status.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-faint">Account operations</p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={onToggle}
          className={`rounded-lg border px-3 py-1.5 text-[14px] font-semibold transition disabled:opacity-50 ${
            suspended ? "border-danger/40 bg-danger/10 text-danger" : "border-line text-soft hover:bg-surface"
          }`}
        >
          {isPending ? "…" : suspended ? "Reactivate account" : "Suspend account"}
        </button>
      </div>

      {suspended && (
        <p className="mt-2 text-[13px] text-danger">
          Account is suspended — the recruiter cannot access apps/recruiter until reactivated.
        </p>
      )}
      {error && <p className="mt-2 text-[13.5px] text-danger">{error}</p>}
      <p className="mt-2 text-[13px] text-faint">All actions here are recorded in the audit log.</p>
    </div>
  );
}
