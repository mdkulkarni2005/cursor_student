"use client";

import { useActionState } from "react";
import { importResumeAction, type ImportResumeState } from "@/lib/actions/resume";
import { GeneratingOverlay } from "@/components/generating-overlay";

export function ImportResumeForm() {
  const [state, action, pending] = useActionState<ImportResumeState, FormData>(importResumeAction, {});

  return (
    <form action={action} className="rounded-2xl border border-dashed border-line-strong bg-card/50 p-4">
      <GeneratingOverlay label="Importing your resume…" sub="Reading and re-rendering your resume into the template. Keep this tab open." />
      <p className="text-[13px] font-semibold text-ink">Already have a resume?</p>
      <p className="mb-3 mt-0.5 text-[12px] text-muted">
        Import your <span className="font-semibold">.docx</span> or <span className="font-semibold">.pdf</span> — we extract your
        details into the editor and re-render in this format. (DOCX parses cleanest.)
      </p>
      <input
        name="file"
        type="file"
        accept=".docx,.pdf"
        required
        className="block w-full text-[12.5px] text-soft file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-cyan hover:file:bg-cyan/12"
      />
      {state.error ? (
        <div className="mt-3 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[12px] text-danger">{state.error}</div>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 w-full rounded-xl border border-line-strong bg-surface py-2.5 text-[13px] font-semibold text-soft transition-colors hover:border-cyan/40 hover:text-cyan disabled:opacity-60"
      >
        {pending ? "Reading your resume…" : "Import & edit →"}
      </button>
    </form>
  );
}
