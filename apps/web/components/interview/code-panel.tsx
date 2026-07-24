"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";
import type { Extension } from "@codemirror/state";
import { submitAnswerAction } from "@/lib/actions/interview";
import { SubmitButton } from "@/components/ui/button";

// CodeMirror touches the DOM — load it client-only to avoid an SSR crash.
const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

type Lang = "python" | "javascript" | "typescript" | "java" | "cpp";
const LANGS: { id: Lang; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C++" },
];

const EXT: Record<Lang, () => Extension> = {
  python: () => python(),
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  java: () => java(),
  cpp: () => cpp(),
};

/** A complete-program skeleton per language (the candidate runs the whole thing). */
function starter(lang: Lang): string {
  switch (lang) {
    case "python":
      return "# Write a complete program. Print your result.\n\n";
    case "javascript":
      return "// Write a complete program. console.log your result.\n\n";
    case "typescript":
      return "// Write a complete program. console.log your result.\n\n";
    case "java":
      return "// Write a complete program.\npublic class Main {\n  public static void main(String[] args) {\n    \n  }\n}";
    case "cpp":
      return "// Write a complete program.\n#include <iostream>\nusing namespace std;\n\nint main() {\n  \n  return 0;\n}";
  }
}

type RunState = { stdout?: string; stderr?: string; status?: string; unavailable?: boolean; message?: string };

export function InterviewCodePanel({ docId, question, runnable, isLast }: { docId: string; question: string; runnable: boolean; isLast: boolean }) {
  const [lang, setLang] = useState<Lang>("python");
  const [code, setCode] = useState<string>(starter("python"));
  const [explanation, setExplanation] = useState("");
  const [run, setRun] = useState<RunState | null>(null);
  const [running, setRunning] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);

  const allStarters = LANGS.map((l) => starter(l.id));
  function onLangChange(next: Lang) {
    setLang(next);
    if (code.trim() === "" || allStarters.includes(code)) setCode(starter(next));
    setRun(null);
  }

  async function doRun() {
    setRunning(true);
    setRun(null);
    try {
      const res = await fetch("/api/interview/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, language: lang, code }),
      });
      const data = (await res.json()) as RunState & { error?: string };
      if (data.unavailable) setRun({ unavailable: true, message: data.message });
      else if (data.error) setRun({ stderr: data.error });
      else setRun(data);
    } catch {
      setRun({ stderr: "Couldn't reach the runner. Try again." });
    } finally {
      setRunning(false);
    }
  }

  async function getHint() {
    setHintLoading(true);
    try {
      const res = await fetch("/api/interview/hint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ docId }) });
      const data = (await res.json()) as { hint?: string; error?: string };
      setHint(data.hint ?? data.error ?? "No hint available.");
    } catch {
      setHint("Couldn't fetch a nudge right now.");
    } finally {
      setHintLoading(false);
    }
  }

  // The submitted answer = the code + an optional approach note; runOutput is sent separately for the evaluator.
  const answer = explanation.trim() ? `${code}\n\n/* Approach: ${explanation.trim()} */` : code;
  const runOutput = run && !run.unavailable ? [run.stdout, run.stderr ? `stderr: ${run.stderr}` : ""].filter(Boolean).join("\n").slice(0, 4000) : "";

  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-cyan">Coding task</p>
        <p className="mb-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-soft">{question}</p>
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[12.5px] font-semibold text-muted">
            {runnable ? "Write your solution — you can run it" : "Write your solution (design question — we assess your approach, not a run)"}
          </label>
          <select
            value={lang}
            onChange={(e) => onLangChange(e.target.value as Lang)}
            className="rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[12px] text-soft outline-none focus:border-cyan/50"
          >
            {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border border-line-strong">
          <CodeMirror
            value={code}
            height="280px"
            theme={oneDark}
            extensions={[EXT[lang]()]}
            onChange={(v) => setCode(v)}
            basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
          />
        </div>

        {runnable ? (
          <div className="mt-3 flex items-center gap-2.5">
            <button
              type="button"
              onClick={doRun}
              disabled={running || code.trim().length < 1}
              className="rounded-lg border border-cyan/35 bg-cyan/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-cyan transition-colors hover:bg-cyan/20 disabled:opacity-60"
            >
              {running ? "Running…" : "▶ Run"}
            </button>
            <button
              type="button"
              onClick={getHint}
              disabled={hintLoading}
              className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-soft disabled:opacity-60"
            >
              {hintLoading ? "…" : "Stuck? Nudge"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={getHint}
            disabled={hintLoading}
            className="mt-3 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-soft disabled:opacity-60"
          >
            {hintLoading ? "…" : "Stuck? Nudge"}
          </button>
        )}

        {hint ? <p className="mt-2 rounded-lg border border-cyan/20 bg-cyan/[0.06] p-2.5 text-[12.5px] leading-relaxed text-soft">{hint}</p> : null}

        {/* Output */}
        {run ? (
          run.unavailable ? (
            <p className="mt-3 rounded-lg border border-warning/25 bg-warning/10 p-2.5 text-[12px] text-warning">{run.message}</p>
          ) : (
            <div className="mt-3 rounded-lg bg-surface p-3 font-mono text-[12px]">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-faint">Output {run.status && run.status !== "ok" ? `· ${run.status}` : ""}</p>
              {run.stdout ? <pre className="whitespace-pre-wrap text-soft">{run.stdout}</pre> : null}
              {run.stderr ? <pre className="whitespace-pre-wrap text-danger">{run.stderr}</pre> : null}
              {!run.stdout && !run.stderr ? <span className="text-faint">(no output)</span> : null}
            </div>
          )
        ) : null}
      </div>

      <form action={submitAnswerAction} className="rounded-2xl border border-line bg-card p-4">
        <input type="hidden" name="docId" value={docId} />
        <input type="hidden" name="answer" value={answer} />
        <input type="hidden" name="language" value={lang} />
        <input type="hidden" name="runOutput" value={runOutput} />
        <label className="mb-1.5 block text-[12.5px] font-semibold text-muted">Explain your approach + complexity (optional but recommended)</label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={3}
          placeholder="Walk through your reasoning, edge cases, and time/space complexity…"
          className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[13px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint"
        />
        <SubmitButton
          loadingText="Submitting…"
          className="mt-3 w-full rounded-xl bg-accent-gradient py-2.5 text-[13.5px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(254,127,45,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {isLast ? "Submit & finish →" : "Submit answer →"}
        </SubmitButton>
      </form>
    </div>
  );
}
