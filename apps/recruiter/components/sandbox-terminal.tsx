"use client";

import { useState } from "react";
import type * as Y from "yjs";

type Lang = "python" | "javascript" | "typescript" | "java" | "cpp";
const LANGS: { id: Lang; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C++" },
];

type RunState = { stdout?: string; stderr?: string; exitCode?: number; unavailable?: boolean; message?: string };

/**
 * Shared terminal for the recruiter-launched Vercel Sandbox coding round — reads the SAME Y.Text
 * as CollabEditor (both sides see identical code), runs it in the real sandbox (package installs,
 * any language/framework), and shows stdout/stderr. Both recruiter and candidate get their own
 * copy of this component, same duplication pattern already accepted for CollabEditor.
 */
export function SandboxTerminal({ ydoc, scheduleId }: { ydoc: Y.Doc | null; scheduleId: string }) {
  const [lang, setLang] = useState<Lang>("python");
  const [run, setRun] = useState<RunState | null>(null);
  const [running, setRunning] = useState(false);

  async function doRun() {
    if (!ydoc) return;
    setRunning(true);
    setRun(null);
    try {
      const code = ydoc.getText("code").toString();
      const res = await fetch("/api/interview-room/sandbox/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId, language: lang, code }),
      });
      const data = (await res.json()) as RunState & { error?: string };
      if (data.unavailable) setRun({ unavailable: true, message: data.message });
      else if (data.error) setRun({ stderr: data.error });
      else setRun(data);
    } catch {
      setRun({ stderr: "Couldn't reach the sandbox. Try again." });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-line bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-[12.5px] font-semibold text-muted">Sandbox terminal</label>
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

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={doRun}
          disabled={running || !ydoc}
          className="rounded-lg border border-cyan/35 bg-cyan/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-cyan transition-colors hover:bg-cyan/20 disabled:opacity-60"
        >
          {running ? "Running…" : "▶ Run in sandbox"}
        </button>
      </div>

      {run &&
        (run.unavailable ? (
          <p className="mt-3 rounded-lg border border-warning/25 bg-warning/10 p-2.5 text-[12px] text-warning">{run.message}</p>
        ) : (
          <div className="mt-3 rounded-lg bg-surface p-3 font-mono text-[12px]">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-faint">
              Output {run.exitCode !== undefined && run.exitCode !== 0 ? `· exit ${run.exitCode}` : ""}
            </p>
            {run.stdout ? <pre className="whitespace-pre-wrap text-soft">{run.stdout}</pre> : null}
            {run.stderr ? <pre className="whitespace-pre-wrap text-danger">{run.stderr}</pre> : null}
            {!run.stdout && !run.stderr ? <span className="text-faint">(no output)</span> : null}
          </div>
        ))}
    </div>
  );
}
