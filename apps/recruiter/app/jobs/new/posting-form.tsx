"use client";

import { useActionState } from "react";
import { createJobPosting, type CreatePostingState } from "@/app/jobs/actions";

export function PostingForm() {
  const [state, action, pending] = useActionState<CreatePostingState, FormData>(createJobPosting, {});

  return (
    <form action={action} className="flex max-w-[560px] flex-col gap-3.5">
      <div>
        <label htmlFor="title" className="mb-1 block text-[11.5px] font-semibold text-muted">Title</label>
        <input
          id="title"
          name="title"
          required
          placeholder="e.g. Backend Engineer (Node.js)"
          className="w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-faint focus:border-cyan/50"
        />
      </div>
      <div>
        <label htmlFor="department" className="mb-1 block text-[11.5px] font-semibold text-muted">Branch (optional)</label>
        <input
          id="department"
          name="department"
          placeholder="e.g. Computer Science"
          className="w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-faint focus:border-cyan/50"
        />
      </div>
      <div>
        <label htmlFor="description" className="mb-1 block text-[11.5px] font-semibold text-muted">Job description</label>
        <textarea
          id="description"
          name="description"
          required
          rows={10}
          placeholder="Paste the full JD — responsibilities, required skills, experience level…"
          className="w-full resize-y rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-faint focus:border-cyan/50"
        />
      </div>
      {state.error ? <p className="text-[12px] text-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create posting"}
      </button>
    </form>
  );
}
