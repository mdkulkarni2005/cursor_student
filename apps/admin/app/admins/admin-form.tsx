"use client";

import { useState, useTransition } from "react";
import { inviteAdmin, removeAdmin } from "./actions";
import type { AdminListing } from "@/lib/admins";

export function AdminManager({ admins }: { admins: AdminListing[] }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "super-admin">("admin");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function onInvite() {
    setError(null);
    if (!email.trim()) return;
    startTransition(async () => {
      try {
        await inviteAdmin(email, role);
        setEmail("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to grant access.");
      }
    });
  }

  function onRemove(clerkId: string, adminEmail: string) {
    setError(null);
    setBusyId(clerkId);
    startTransition(async () => {
      try {
        await removeAdmin(clerkId, adminEmail);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to revoke access.");
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-faint">Grant admin access</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="email"
            placeholder="person@college.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-[220px] flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] text-ink"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "super-admin")}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
          >
            <option value="admin">Admin</option>
            <option value="super-admin">Super-admin</option>
          </select>
          <button
            type="button"
            disabled={isPending}
            onClick={onInvite}
            className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-soft transition hover:bg-surface disabled:opacity-50"
          >
            {isPending ? "…" : "Grant"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-faint">
          The person must already have a Clerk account (have signed in at least once) for lookup by email to work.
        </p>
        {error && <p className="mt-2 text-[11.5px] text-danger">{error}</p>}
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-faint">Current admins ({admins.length})</p>
        {admins.length === 0 ? (
          <p className="text-[13px] text-faint">No admins found.</p>
        ) : (
          <ul className="space-y-2 text-[13px]">
            {admins.map((a) => (
              <li key={a.clerkId} className="flex items-center justify-between gap-3 border-b border-line/60 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="text-ink">{a.name ?? a.email}</p>
                  <p className="text-[11px] text-faint">{a.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      a.role === "super-admin" ? "bg-cyan/12 text-cyan" : "bg-surface text-soft"
                    }`}
                  >
                    {a.role}
                  </span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onRemove(a.clerkId, a.email)}
                    className="rounded-lg border border-danger/40 px-2.5 py-1 text-[11.5px] font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-50"
                  >
                    {busyId === a.clerkId ? "…" : "Revoke"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
