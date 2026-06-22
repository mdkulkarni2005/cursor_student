"use client";

import { useFormStatus } from "react-dom";
import { deleteDocumentAction } from "@/lib/actions/documents";
import { Spinner } from "@/components/ui/button";

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M10 11v6M14 11v6" />
    </svg>
  );
}

function FullInner() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-[13.5px] font-semibold text-danger transition-colors hover:bg-danger/20 disabled:opacity-60"
    >
      {pending ? <Spinner /> : <TrashIcon />}
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

function CompactInner() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title="Delete"
      aria-label="Delete"
      className="flex size-8 items-center justify-center rounded-lg border border-line-strong bg-base/80 text-faint backdrop-blur transition-colors hover:border-danger/40 hover:bg-danger/15 hover:text-danger disabled:opacity-60"
    >
      {pending ? <Spinner /> : <TrashIcon />}
    </button>
  );
}

/**
 * Delete button for a document. Confirms first, shows a loading state, then redirects to the list.
 * `compact` renders an icon-only button suited to overlaying on list rows.
 */
export function DeleteDocButton({ docId, kind = "document", compact = false }: { docId: string; kind?: string; compact?: boolean }) {
  return (
    <form
      action={deleteDocumentAction}
      onSubmit={(e) => {
        if (!confirm(`Delete this ${kind}? This can't be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="docId" value={docId} />
      {compact ? <CompactInner /> : <FullInner />}
    </form>
  );
}
