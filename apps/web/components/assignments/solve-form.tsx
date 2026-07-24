"use client";

import Link from "next/link";
import { useActionState } from "react";
import { solveAssignmentAction, type AssignmentFormState } from "@/lib/actions/assignments";
import { GeneratingOverlay } from "@/components/generating-overlay";
import { useErrorToast } from "@/lib/use-error-toast";

const label = "mb-1.5 block text-[12.5px] font-semibold text-muted";
const box =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint";

export function SolveAssignmentForm() {
  const [state, action, pending] = useActionState<AssignmentFormState, FormData>(
    solveAssignmentAction,
    {},
  );
  useErrorToast(state.error);

  return (
    <form action={action} className="rounded-2xl border border-line bg-card p-5">
      <GeneratingOverlay label="Solving your assignment…" />
      <div className="mb-4">
        <label htmlFor="questionText" className={label}>
          The question
        </label>
        <textarea
          id="questionText"
          name="questionText"
          rows={4}
          placeholder="Type or paste the question…"
          className={`${box} resize-none`}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="image" className={label}>
          …or snap a photo / upload a PDF
        </label>
        <input
          id="image"
          name="image"
          type="file"
          accept="image/*,application/pdf"
          className="w-full cursor-pointer rounded-xl border border-dashed border-line-strong bg-surface px-3.5 py-2.5 text-[13px] text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-raised file:px-3 file:py-1.5 file:text-[12.5px] file:font-semibold file:text-soft hover:border-cyan/40"
        />
      </div>

      <div className="mb-5">
        <label htmlFor="instructions" className={label}>
          Instructions <span className="font-normal text-faint">(optional)</span>
        </label>
        <textarea
          id="instructions"
          name="instructions"
          rows={2}
          placeholder="e.g. show all steps · use the standard formula · write code in Python"
          className={`${box} resize-none`}
        />
      </div>

      {state.error ? (
        <div className="mb-4 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
          {state.error}
          {state.upgrade ? (
            <Link href="/plans" className="ml-1 font-semibold underline">
              View plans →
            </Link>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-accent-gradient py-3 text-[14px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(254,127,45,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {pending ? "Solving…" : "Solve assignment →"}
      </button>
    </form>
  );
}
