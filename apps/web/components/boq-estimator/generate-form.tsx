"use client";

import Link from "next/link";
import { useActionState } from "react";
import { generateBoqAction, type BoqFormState } from "@/lib/actions/boq-estimator";
import { GeneratingOverlay } from "@/components/generating-overlay";

const label = "mb-1.5 block text-[12.5px] font-semibold text-muted";
const box =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint";

export function GenerateBoqForm() {
  const [state, action, pending] = useActionState<BoqFormState, FormData>(
    generateBoqAction,
    {},
  );

  return (
    <form action={action} className="rounded-2xl border border-line bg-card p-5">
      <GeneratingOverlay label="Estimating quantities…" />
      <div className="mb-4">
        <label htmlFor="dimensionsText" className={label}>
          Dimensions / scope of work
        </label>
        <textarea
          id="dimensionsText"
          name="dimensionsText"
          rows={4}
          placeholder="e.g. Foundation excavation 10m x 5m x 1.5m deep, PCC 1:4:8 below footing 10m x 5m x 0.15m…"
          className={`${box} resize-none`}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="image" className={label}>
          …or upload a photo of the drawing
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
          placeholder="e.g. use current DSR rates for Maharashtra · include only civil items"
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
        className="w-full rounded-xl bg-accent-gradient py-3 text-[14px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(79,70,229,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {pending ? "Estimating…" : "Generate BOQ →"}
      </button>
    </form>
  );
}
