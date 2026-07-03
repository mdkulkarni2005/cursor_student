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

/**
 * Recruiter-side twin of apps/web's CollabEditor — same shared Y.Text, no Run button (execution
 * only lives candidate-side; content still syncs to both). UNVERIFIED IN THIS ENVIRONMENT.
 */
export function CollabEditor({ ydoc }: { ydoc: Y.Doc | null }) {
  const [lang, setLang] = useState<Lang>("python");
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
    </div>
  );
}
