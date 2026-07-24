"use client";

import Link from "next/link";
import { useActionState } from "react";
import { generatePptAction, type PptFormState } from "@/lib/actions/ppt";
import { ClarifyQuestions } from "@/components/clarify-questions";
import { Button } from "@/components/ui/button";
import { GeneratingOverlay } from "@/components/generating-overlay";
import { useErrorToast } from "@/lib/use-error-toast";

const label = "mb-1.5 block text-[12.5px] font-semibold text-muted";
const box =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint";

export function GeneratePptForm() {
  const [state, action, pending] = useActionState<PptFormState, FormData>(generatePptAction, {});
  useErrorToast(state.error);
  const questions = state.questions ?? [];

  return (
    <form action={action} className="rounded-2xl border border-line bg-card p-5">
      <GeneratingOverlay label="Generating your presentation…" />
      <div className="mb-4">
        <label htmlFor="title" className={label}>
          Presentation topic
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="e.g. Smart Energy Meter using IoT"
          className={box}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="slideCount" className={label}>
          Number of slides
        </label>
        <select id="slideCount" name="slideCount" defaultValue="8" className={box}>
          {[6, 8, 10, 12].map((n) => (
            <option key={n} value={n}>
              {n} slides
            </option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <label htmlFor="guidelines" className={label}>
          Guidelines <span className="font-normal text-faint">(optional)</span>
        </label>
        <textarea
          id="guidelines"
          name="guidelines"
          rows={3}
          placeholder="Anything specific to cover or emphasize…"
          className={`${box} resize-none`}
        />
      </div>

      <div className="mb-5">
        <label htmlFor="template" className={label}>
          Your college template <span className="font-normal text-faint">(optional .pptx)</span>
        </label>
        <input
          id="template"
          name="template"
          type="file"
          accept=".pptx"
          className="block w-full text-[13px] text-soft file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-2 file:text-[12.5px] file:font-semibold file:text-cyan hover:file:bg-cyan/12"
        />
        <p className="mt-1.5 text-[11.5px] text-faint">
          We match your template&apos;s brand colors and fonts — your format stays intact.
        </p>
      </div>

      {questions.length > 0 ? (
        <>
          <ClarifyQuestions questions={questions} />
          {state.templateKey ? (
            <input type="hidden" name="templateKey" value={state.templateKey} />
          ) : null}
        </>
      ) : null}

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

      <Button
        type="submit"
        loading={pending}
        loadingText="Building your deck…"
        className="w-full rounded-xl bg-accent-gradient py-3 text-[14px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(254,127,45,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {questions.length > 0 ? "Continue →" : "Generate PPT →"}
      </Button>
      <p className="mt-3 text-center text-[11.5px] text-faint">Speaker notes included · exported as PPTX</p>
    </form>
  );
}
