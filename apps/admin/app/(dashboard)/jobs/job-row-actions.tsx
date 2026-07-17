"use client";

import { useState, useTransition } from "react";
import { unstickJob, deleteFailedDocument } from "./actions";

export function JobRowActions({ jobId, documentId, isStuck }: { jobId: string; documentId: string; isStuck: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteFailedDocument(documentId);
      } catch {
        setError("Failed to delete.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {isStuck && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => unstickJob(jobId))}
          className="rounded-lg border border-line px-2.5 py-1 text-[13.5px] font-semibold text-soft hover:bg-surface disabled:opacity-50"
        >
          Mark failed
        </button>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={onDelete}
        className={`rounded-lg border px-2.5 py-1 text-[13.5px] font-semibold disabled:opacity-50 ${
          confirmDelete ? "border-danger bg-danger text-on-accent" : "border-danger/40 text-danger hover:bg-danger/10"
        }`}
      >
        {confirmDelete ? "Confirm?" : "Delete doc"}
      </button>
      {error && <span className="text-[13px] text-danger">{error}</span>}
    </div>
  );
}
