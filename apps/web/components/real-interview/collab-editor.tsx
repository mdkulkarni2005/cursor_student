"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type * as Y from "yjs";
import { yCollab } from "y-codemirror.next";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";
import type { Extension } from "@codemirror/state";

// CodeMirror touches the DOM — load it client-only to avoid an SSR crash (same as Phase C's code-panel.tsx).
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

type RunState = { stdout?: string; stderr?: string; status?: string; unavailable?: boolean; message?: string };

/**
 * Shared scratchpad editor for the call — content is owned by the Yjs doc (yCollab extension),
 * NOT controlled React state; both participants edit the same Y.Text. No "value"/"onChange" props
 * are passed to CodeMirror for that reason. Run button only exists here (candidate side) — the
 * recruiter's copy of this component (if mounted) can omit it; content stays in sync either way.
 *
 * UNVERIFIED IN THIS ENVIRONMENT — the yCollab + @uiw/react-codemirror uncontrolled-mode
 * interaction specifically needs a live two-person browser test.
 */
export function CollabEditor({ ydoc, scheduleId, showRun }: { ydoc: Y.Doc | null; scheduleId: string; showRun: boolean }) {
  const [lang, setLang] = useState<Lang>("python");
  const [run, setRun] = useState<RunState | null>(null);
  const [running, setRunning] = useState(false);

  async function doRun() {
    if (!ydoc) return;
    setRunning(true);
    setRun(null);
    try {
      const code = ydoc.getText("code").toString();
      const res = await fetch("/api/interview-room/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId, language: lang, code }),
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

  if (!ydoc) return null;
  const ytext = ydoc.getText("code");

  return (
    <div className="mt-3 rounded-2xl border border-line bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-[12.5px] font-semibold text-muted">Shared code</label>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[12px] text-soft outline-none focus:border-cyan/50"
        >
          {LANGS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-line-strong">
        <CodeMirror
          height="280px"
          theme={oneDark}
          extensions={[EXT[lang](), yCollab(ytext, undefined)]}
          basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
        />
      </div>

      {showRun && (
        <div className="mt-3 flex items-center gap-2.5">
          <button
            type="button"
            onClick={doRun}
            disabled={running}
            className="rounded-lg border border-cyan/35 bg-cyan/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-cyan transition-colors hover:bg-cyan/20 disabled:opacity-60"
          >
            {running ? "Running…" : "▶ Run"}
          </button>
        </div>
      )}

      {run &&
        (run.unavailable ? (
          <p className="mt-3 rounded-lg border border-warning/25 bg-warning/10 p-2.5 text-[12px] text-warning">{run.message}</p>
        ) : (
          <div className="mt-3 rounded-lg bg-surface p-3 font-mono text-[12px]">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-faint">
              Output {run.status && run.status !== "ok" ? `· ${run.status}` : ""}
            </p>
            {run.stdout ? <pre className="whitespace-pre-wrap text-soft">{run.stdout}</pre> : null}
            {run.stderr ? <pre className="whitespace-pre-wrap text-danger">{run.stderr}</pre> : null}
            {!run.stdout && !run.stderr ? <span className="text-faint">(no output)</span> : null}
          </div>
        ))}
    </div>
  );
}
