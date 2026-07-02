"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";
import type { Extension } from "@codemirror/state";
import { Button } from "@/components/ui/button";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

export const LANGUAGES = ["Python", "JavaScript", "TypeScript", "Java", "C++"] as const;
const LANG_EXT: Record<string, () => Extension> = {
  Python: () => python(),
  JavaScript: () => javascript(),
  TypeScript: () => javascript({ typescript: true }),
  Java: () => java(),
  "C++": () => cpp(),
};

export function SolveEditor({
  slug,
  language,
  code,
  onLanguageChange,
  onCodeChange,
  supported,
}: {
  slug: string;
  language: string;
  code: string;
  onLanguageChange: (next: string) => void;
  onCodeChange: (next: string) => void;
  supported: boolean;
}) {
  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);

  const ext = (LANG_EXT[language] ?? LANG_EXT.Python)();

  async function getHint() {
    setHintLoading(true);
    setHintError(null);
    try {
      const res = await fetch("/api/dsa/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, code, language }),
      });
      const d = await res.json();
      if (d.error) setHintError(d.error);
      else setHint(d.hint);
    } catch {
      setHintError("Couldn't fetch a hint — try again.");
    } finally {
      setHintLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <label className="text-[12.5px] font-semibold text-muted">
          Implement <code className="font-mono text-cyan">solve(...)</code>
        </label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={getHint}
            loading={hintLoading}
            loadingText="Thinking…"
            className="rounded-lg border border-warning/35 bg-warning/10 px-2.5 py-1 text-[12px] font-semibold text-warning hover:bg-warning/15"
          >
            💡 Hint
          </Button>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[12px] text-soft outline-none focus:border-cyan/50"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <CodeMirror
          value={code}
          height="100%"
          style={{ height: "100%" }}
          theme={oneDark}
          extensions={[ext]}
          onChange={onCodeChange}
          placeholder="Write your solution here…"
          basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, highlightActiveLine: true, bracketMatching: true, closeBrackets: true, indentOnInput: true }}
        />
      </div>

      {hint ? (
        <div className="border-t border-warning/30 bg-warning/[0.07] px-3.5 py-2.5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-warning">💡 Hint</p>
          <p className="text-[13px] leading-relaxed text-soft">{hint}</p>
        </div>
      ) : null}
      {hintError ? <p className="border-t border-line px-3.5 py-2 text-[11.5px] text-warning">{hintError}</p> : null}

      {!supported ? (
        <p className="border-t border-line px-3.5 py-2 text-[11.5px] text-warning">
          Auto-grading for {language} is coming soon — you can still submit and we&apos;ll save your attempt.
        </p>
      ) : null}
    </div>
  );
}
