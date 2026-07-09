"use client";

import Link from "next/link";
import { useActionState } from "react";
import { generateReportAction, type ReportFormState } from "@/lib/actions/reports";
import { ClarifyQuestions } from "@/components/clarify-questions";
import { REPORT_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { GeneratingOverlay } from "@/components/generating-overlay";
import { useErrorToast } from "@/lib/use-error-toast";

const label = "mb-1.5 block text-[12.5px] font-semibold text-muted";
const box =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint";

export function GenerateReportForm() {
  const [state, action, pending] = useActionState<ReportFormState, FormData>(
    generateReportAction,
    {},
  );
  useErrorToast(state.error);

  return (
    <form action={action} className="rounded-2xl border border-line bg-card p-5">
      <GeneratingOverlay label="Generating your report…" />
      <div className="mb-4">
        <label htmlFor="title" className={label}>
          Report topic
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="e.g. Waste Heat Recovery in IC Engines"
          className={box}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="reportType" className={label}>
          Report type
        </label>
        <select id="reportType" name="reportType" defaultValue="seminar" className={box}>
          {REPORT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
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
          placeholder="Any specific requirements from your college or guide…"
          className={`${box} resize-none`}
        />
      </div>

      <div className="mb-5">
        <label htmlFor="template" className={label}>
          Your college template{" "}
          <span className="font-normal text-faint">(optional .docx — we fill it without changing your format)</span>
        </label>
        {state.templateKey ? (
          <div className="flex items-center gap-2 rounded-xl border border-cyan/30 bg-cyan/[0.06] px-3.5 py-2.5 text-[12.5px] font-semibold text-cyan">
            ✓ Template attached
            <input type="hidden" name="templateKey" value={state.templateKey} />
          </div>
        ) : (
          <input
            id="template"
            name="template"
            type="file"
            accept=".docx"
            className="w-full cursor-pointer rounded-xl border border-dashed border-line-strong bg-surface px-3.5 py-2.5 text-[13px] text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-raised file:px-3 file:py-1.5 file:text-[12.5px] file:font-semibold file:text-soft hover:border-cyan/40"
          />
        )}
      </div>

      {state.questions && state.questions.length > 0 ? (
        <ClarifyQuestions questions={state.questions} />
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
        loadingText="Generating your report…"
        className="w-full rounded-xl bg-accent-gradient py-3 text-[14px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(246,146,30,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {state.questions && state.questions.length > 0
          ? "Generate with these answers →"
          : "Generate report →"}
      </Button>
      <p className="mt-3 text-center text-[11.5px] text-faint">
        Generated in your college&apos;s format · exported as DOCX
      </p>
    </form>
  );
}
