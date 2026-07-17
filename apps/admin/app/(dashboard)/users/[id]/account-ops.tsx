"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setUserSuspended,
  setUserCodingEnabled,
  resetUserQuota,
  exportUserData,
  deleteUserData,
} from "./actions";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AccountOps({
  userId,
  suspended,
  codingEnabled,
  email,
}: {
  userId: string;
  suspended: boolean;
  codingEnabled: boolean;
  email: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function run(label: string, fn: () => Promise<void>) {
    setError(null);
    setBusy(label);
    startTransition(async () => {
      try {
        await fn();
      } catch {
        setError(`Failed: ${label}.`);
      } finally {
        setBusy(null);
      }
    });
  }

  async function onExport() {
    setError(null);
    setBusy("export");
    try {
      const data = await exportUserData(userId);
      downloadJson(`user-${userId}.json`, data);
    } catch {
      setError("Failed to export data.");
    } finally {
      setBusy(null);
    }
  }

  function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    setBusy("delete");
    startTransition(async () => {
      try {
        await deleteUserData(userId);
        router.push("/users");
      } catch {
        setError("Failed to delete account.");
        setBusy(null);
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
          onClick={() => run("suspend", () => setUserSuspended(userId, !suspended))}
          className={`rounded-lg border px-3 py-1.5 text-[14px] font-semibold transition disabled:opacity-50 ${
            suspended ? "border-danger/40 bg-danger/10 text-danger" : "border-line text-soft hover:bg-surface"
          }`}
        >
          {busy === "suspend" ? "…" : suspended ? "Reactivate account" : "Suspend account"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => run("coding", () => setUserCodingEnabled(userId, !codingEnabled))}
          className="rounded-lg border border-line px-3 py-1.5 text-[14px] font-semibold text-soft transition hover:bg-surface disabled:opacity-50"
        >
          {busy === "coding" ? "…" : codingEnabled ? "Disable coding track" : "Enable coding track"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => run("quota", () => resetUserQuota(userId))}
          className="rounded-lg border border-line px-3 py-1.5 text-[14px] font-semibold text-soft transition hover:bg-surface disabled:opacity-50"
        >
          {busy === "quota" ? "…" : "Reset this month's quota"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={onExport}
          className="rounded-lg border border-line px-3 py-1.5 text-[14px] font-semibold text-soft transition hover:bg-surface disabled:opacity-50"
        >
          {busy === "export" ? "…" : "Export data (JSON)"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={onDelete}
          className={`rounded-lg border px-3 py-1.5 text-[14px] font-semibold transition disabled:opacity-50 ${
            confirmDelete
              ? "border-danger bg-danger text-on-accent"
              : "border-danger/40 text-danger hover:bg-danger/10"
          }`}
        >
          {busy === "delete" ? "…" : confirmDelete ? `Confirm delete ${email}?` : "Delete account"}
        </button>
        {confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="text-[14px] font-medium text-faint hover:text-soft"
          >
            cancel
          </button>
        )}
      </div>

      {suspended && (
        <p className="mt-2 text-[13px] text-danger">
          Account is suspended — the student cannot access the app until reactivated.
        </p>
      )}
      {error && <p className="mt-2 text-[13.5px] text-danger">{error}</p>}
      <p className="mt-2 text-[13px] text-faint">All actions here are recorded in the audit log.</p>
    </div>
  );
}
