"use client";

import type { AttemptFormState } from "@/lib/actions/dsa";
import type { GradeResult } from "@/lib/dsa/grade";

export type RunState = { grade?: GradeResult; unavailable?: boolean; message?: string; error?: string };

function GradeBanner({ grade, unverifiedMessage }: { grade?: GradeResult; unverifiedMessage?: string }) {
  if (!grade) return null;
  const banner =
    grade.verdict === "passed"
      ? { cls: "border-success/30 bg-success/10 text-success", label: `✓ ${grade.passed}/${grade.total} passed` }
      : grade.verdict === "failed"
        ? { cls: "border-danger/30 bg-danger/10 text-danger", label: `✗ ${grade.passed}/${grade.total} passed` }
        : { cls: "border-warning/30 bg-warning/10 text-warning", label: unverifiedMessage ?? grade.message ?? "Couldn't run your code" };
  return <div className={`rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold ${banner.cls}`}>{banner.label}</div>;
}

function Outcomes({ grade }: { grade: GradeResult }) {
  const firstFail = grade.outcomes.find((o) => !o.passed);
  return (
    <>
      {grade.outcomes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {grade.outcomes.map((o, i) => (
            <span
              key={i}
              title={o.error ?? (o.passed ? "passed" : `expected ${JSON.stringify(o.expected)}, got ${JSON.stringify(o.got)}`)}
              className={`flex size-7 items-center justify-center rounded-lg text-[12px] font-bold ${o.passed ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}
            >
              {o.passed ? "✓" : "✗"}
            </span>
          ))}
        </div>
      ) : null}

      {firstFail && grade.verdict === "failed" ? (
        <div className="mt-3 rounded-lg bg-surface/60 p-3 font-mono text-[11.5px] text-soft">
          {firstFail.error ? (
            <p className="text-danger">{firstFail.error}</p>
          ) : (
            <>
              <p><span className="text-faint">expected:</span> {JSON.stringify(firstFail.expected)}</p>
              <p><span className="text-faint">your output:</span> {JSON.stringify(firstFail.got)}</p>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}

export function RunConsole({
  onRun,
  running,
  runResult,
  runDisabled,
  submitState,
  submitPending,
}: {
  onRun: () => void;
  running: boolean;
  runResult: RunState | null;
  runDisabled: boolean;
  submitState: AttemptFormState;
  submitPending: boolean;
}) {
  const submitReview = submitState.review;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Console</p>
        <button
          type="button"
          onClick={onRun}
          disabled={running || runDisabled}
          title={runDisabled ? "No sample tests available for this problem" : undefined}
          className="rounded-lg border border-cyan/35 bg-cyan/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-cyan transition-colors hover:bg-cyan/20 disabled:opacity-60"
        >
          {running ? "Running…" : "▶ Run"}
        </button>
      </div>

      {!runResult && !submitReview ? (
        <p className="text-[12.5px] text-faint">Run checks your code against the visible sample tests. Submit runs the full hidden test suite and counts toward your streak.</p>
      ) : null}

      {runResult ? (
        <div className="mb-4">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-faint">Sample tests</p>
          {runResult.error ? (
            <div className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-[12px] text-danger">{runResult.error}</div>
          ) : runResult.unavailable ? (
            <div className="rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-[12px] text-warning">{runResult.message}</div>
          ) : (
            <>
              <GradeBanner grade={runResult.grade} />
              {runResult.grade ? <Outcomes grade={runResult.grade} /> : null}
            </>
          )}
        </div>
      ) : null}

      {submitReview ? (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-faint">Full submission result</p>
          <GradeBanner grade={submitReview.grade} />
          <Outcomes grade={submitReview.grade} />
          {submitReview.aiReview ? (
            <div className="mt-4 border-t border-line pt-4">
              <h3 className="text-[13px] font-semibold text-ink">Coach&apos;s feedback</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-lg bg-surface px-3 py-1.5 text-[12px] text-soft"><span className="text-faint">Time:</span> <span className="font-mono">{submitReview.aiReview.timeComplexity}</span></span>
                <span className="rounded-lg bg-surface px-3 py-1.5 text-[12px] text-soft"><span className="text-faint">Space:</span> <span className="font-mono">{submitReview.aiReview.spaceComplexity}</span></span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-soft">{submitReview.aiReview.feedback}</p>
              {submitReview.aiReview.suggestions.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {submitReview.aiReview.suggestions.map((s, i) => (
                    <li key={i} className="flex gap-1.5 text-[12.5px] text-soft"><span className="text-cyan">→</span>{s}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {submitState.error ? (
        <div className="mt-3 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[12px] text-danger">{submitState.error}</div>
      ) : null}

      {submitPending ? <p className="mt-3 text-[12px] text-faint">Submitting…</p> : null}
    </div>
  );
}
