"use client";

import Link from "next/link";
import { useActionState } from "react";
import { generateDrawingVivaAction, type DrawingVivaFormState } from "@/lib/actions/drawing-viva";
import { GeneratingOverlay } from "@/components/generating-overlay";
import { useErrorToast } from "@/lib/use-error-toast";

const label = "mb-1.5 block text-[12.5px] font-semibold text-muted";

export function GenerateDrawingVivaForm() {
  const [state, action, pending] = useActionState<DrawingVivaFormState, FormData>(
    generateDrawingVivaAction,
    {},
  );
  useErrorToast(state.error);

  return (
    <form action={action} className="rounded-2xl border border-line bg-card p-5">
      <GeneratingOverlay label="Analyzing your drawing…" />
      <div className="mb-4">
        <label htmlFor="image" className={label}>
          Photo of your drawing / sketch
        </label>
        <input
          id="image"
          name="image"
          type="file"
          required
          accept="image/*"
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
          placeholder="e.g. focus on GD&T · this is an assembly drawing · third-angle projection"
          className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint"
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
        className="w-full rounded-xl bg-accent-gradient py-3 text-[14px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(246,146,30,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {pending ? "Analyzing…" : "Generate viva questions →"}
      </button>
    </form>
  );
}
