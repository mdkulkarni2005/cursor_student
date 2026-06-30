"use client";

import { useState } from "react";
import { addSubject } from "@/lib/actions/semester";
import { PlusIcon } from "@/components/icons";

export function AddSubjectButton({ variant = "header" }: { variant?: "header" | "ghost" }) {
  const [open, setOpen] = useState(false);

  if (variant === "ghost") {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="group flex min-h-[300px] w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line p-7 text-center transition-all duration-300 hover:border-cyan/40 hover:bg-cyan/5"
        >
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-surface text-muted transition-all group-hover:bg-cyan group-hover:text-on-accent">
            <PlusIcon size={28} />
          </div>
          <h3 className="font-display text-[18px] font-semibold text-muted group-hover:text-cyan">New Subject</h3>
          <p className="mt-2 px-4 text-[13px] text-muted">Add a course from the curriculum or create a custom workspace.</p>
        </button>
        {open && <Dialog onClose={() => setOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-cyan px-5 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform active:scale-95"
      >
        <PlusIcon size={18} />
        Add Subject
      </button>
      {open && <Dialog onClose={() => setOpen(false)} />}
    </>
  );
}

function Dialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-[400px] rounded-2xl border border-line bg-card p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-display text-[18px] font-semibold text-ink">Add a subject</h2>
        <form action={addSubject} onSubmit={() => setTimeout(onClose, 50)} className="space-y-3">
          <input
            name="name"
            required
            autoFocus
            placeholder="Subject name (e.g. Operating Systems)"
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-cyan/50"
          />
          <input
            name="code"
            placeholder="Course code (optional, e.g. CS-301)"
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-cyan/50"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-[13.5px] font-medium text-muted hover:bg-surface">
              Cancel
            </button>
            <button type="submit" className="rounded-xl bg-cyan px-5 py-2 text-[13.5px] font-semibold text-on-accent">
              Add subject
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
