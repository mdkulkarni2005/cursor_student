"use client";

import { useActionState, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { submitAttemptAction, type AttemptFormState } from "@/lib/actions/dsa";
import { SolveEditor, LANGUAGES } from "@/components/dsa/solve-editor";
import { RunConsole, type RunState } from "@/components/dsa/run-console";
import type { DsaProblem } from "@/lib/dsa/catalog";

const ResizeHandle = ({ direction }: { direction: "horizontal" | "vertical" }) => (
  <PanelResizeHandle
    className={
      direction === "horizontal"
        ? "w-1.5 shrink-0 bg-line transition-colors hover:bg-cyan/40 data-[resize-handle-active]:bg-cyan/60"
        : "h-1.5 shrink-0 bg-line transition-colors hover:bg-cyan/40 data-[resize-handle-active]:bg-cyan/60"
    }
  />
);

export function SolveWorkspace({
  slug,
  problem,
  starters,
  samples,
  initialCode,
  initialLanguage,
}: {
  slug: string;
  problem: DsaProblem;
  /** Per-language starter stubs (label → code). Missing = language not auto-graded yet. */
  starters: Record<string, string>;
  /** Visible/sample tests only — the hidden set never reaches the client. */
  samples: { args: unknown[]; expected: unknown }[];
  initialCode?: string;
  initialLanguage?: string;
}) {
  const [submitState, submitAction, submitPending] = useActionState<AttemptFormState, FormData>(submitAttemptAction, {});
  const startLang = initialLanguage && (LANGUAGES as readonly string[]).includes(initialLanguage) ? initialLanguage : "Python";
  const [language, setLanguage] = useState<string>(startLang);
  const [code, setCode] = useState<string>(initialCode ?? starters[startLang] ?? "");
  const [runResult, setRunResult] = useState<RunState | null>(null);
  const [running, setRunning] = useState(false);

  const allStarters = Object.values(starters);
  function onLanguageChange(next: string) {
    setLanguage(next);
    if (code.trim() === "" || allStarters.includes(code)) {
      setCode(starters[next] ?? "");
    }
    setRunResult(null);
  }

  async function doRun() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/dsa/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, language, code }),
      });
      const data = (await res.json()) as RunState;
      setRunResult(data);
    } catch {
      setRunResult({ error: "Couldn't reach the runner. Try again." });
    } finally {
      setRunning(false);
    }
  }

  const supported = starters[language] !== undefined;

  const promptPane = (
    <div className="h-full overflow-y-auto p-5">
      <p className="text-[13.5px] leading-relaxed text-soft">{problem.prompt}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {problem.tags.map((t) => (
          <span key={t} className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11.5px] text-muted">{t}</span>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {problem.examples.map((ex, i) => (
          <div key={i} className="rounded-lg bg-surface p-3 font-mono text-[12px] text-soft">
            <p><span className="text-faint">Input:</span> {ex.input}</p>
            <p><span className="text-faint">Output:</span> {ex.output}</p>
            {ex.explanation ? <p className="text-faint">{`// ${ex.explanation}`}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );

  const editorPane = (
    <SolveEditor
      slug={slug}
      language={language}
      code={code}
      onLanguageChange={onLanguageChange}
      onCodeChange={setCode}
      supported={supported}
    />
  );

  const consolePane = (
    <div className="flex h-full flex-col border-t border-line">
      <RunConsole
        onRun={doRun}
        running={running}
        runResult={runResult}
        runDisabled={samples.length === 0}
        submitState={submitState}
        submitPending={submitPending}
      />
      <form action={submitAction} className="border-t border-line p-3">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="language" value={language} />
        <button
          type="submit"
          disabled={submitPending || code.trim().length < 10}
          className="w-full rounded-xl bg-accent-gradient py-2.5 text-[13.5px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(246,146,30,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {submitPending ? "Submitting…" : "Submit →"}
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Mobile / tablet: stacked, non-resizable sections. */}
      <div className="flex flex-col gap-3 lg:hidden">
        <div className="max-h-[45vh] overflow-y-auto rounded-2xl border border-line bg-card">{promptPane}</div>
        <div className="h-[420px] overflow-hidden rounded-2xl border border-line bg-card">{editorPane}</div>
        <div className="min-h-[260px] overflow-hidden rounded-2xl border border-line bg-card">{consolePane}</div>
      </div>

      {/* Desktop: resizable split panes. */}
      <div className="hidden h-[calc(100vh-190px)] min-h-[560px] flex-col rounded-2xl border border-line bg-card lg:flex">
        <PanelGroup direction="horizontal" className="flex-1">
          <Panel defaultSize={35} minSize={20} className="min-w-0">
            {promptPane}
          </Panel>

          <ResizeHandle direction="horizontal" />

          <Panel minSize={30}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={65} minSize={25}>
                {editorPane}
              </Panel>

              <ResizeHandle direction="vertical" />

              <Panel defaultSize={35} minSize={15}>
                {consolePane}
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </>
  );
}
