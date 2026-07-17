"use client";

import { useState, useTransition } from "react";
import { setTemplateDefault, deleteTemplate } from "./actions";

export function TemplateRow({
  id,
  type,
  institutionId,
  isDefault,
}: {
  id: string;
  type: string;
  institutionId: string | null;
  isDefault: boolean;
}) {
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
        await deleteTemplate(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete.");
        setConfirmDelete(false);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {!isDefault && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => setTemplateDefault(id, type, institutionId))}
          className="rounded-lg border border-line px-2.5 py-1 text-[13.5px] font-semibold text-soft hover:bg-surface disabled:opacity-50"
        >
          Make default
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
        {confirmDelete ? "Confirm?" : "Delete"}
      </button>
      {error && <span className="text-[13px] text-danger">{error}</span>}
    </div>
  );
}
