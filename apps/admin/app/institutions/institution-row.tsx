"use client";

import { useState, useTransition } from "react";
import { updateInstitution, deleteInstitution } from "./actions";

export function InstitutionRow({
  id,
  name,
  university,
  userCount,
  templateCount,
}: {
  id: string;
  name: string;
  university: string | null;
  userCount: number;
  templateCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function onSave(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateInstitution(id, formData);
        setEditing(false);
      } catch {
        setError("Failed to save.");
      }
    });
  }

  function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteInstitution(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete.");
        setConfirmDelete(false);
      }
    });
  }

  if (editing) {
    return (
      <tr className="border-b border-line/60 last:border-0">
        <td className="px-3 py-2.5" colSpan={4}>
          <form action={onSave} className="flex flex-wrap items-center gap-2">
            <input
              name="name"
              defaultValue={name}
              required
              className="rounded-lg border border-line bg-input px-2.5 py-1.5 text-[12.5px] text-ink"
            />
            <input
              name="university"
              defaultValue={university ?? ""}
              placeholder="University (optional)"
              className="rounded-lg border border-line bg-input px-2.5 py-1.5 text-[12.5px] text-ink"
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-cyan px-2.5 py-1.5 text-[11.5px] font-semibold text-on-accent"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-[11.5px] font-medium text-faint hover:text-soft"
            >
              Cancel
            </button>
            {error && <span className="text-[11px] text-danger">{error}</span>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-line/60 last:border-0 hover:bg-surface">
      <td className="px-3 py-2.5 font-medium text-ink">{name}</td>
      <td className="px-3 py-2.5 text-soft">{university ?? "—"}</td>
      <td className="px-3 py-2.5 text-soft">
        {userCount} users · {templateCount} templates
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-semibold text-soft hover:bg-surface"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onDelete}
            className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold disabled:opacity-50 ${
              confirmDelete ? "border-danger bg-danger text-on-accent" : "border-danger/40 text-danger hover:bg-danger/10"
            }`}
          >
            {confirmDelete ? "Confirm?" : "Delete"}
          </button>
          {error && <span className="text-[11px] text-danger">{error}</span>}
        </div>
      </td>
    </tr>
  );
}
