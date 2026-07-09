"use client";

import { useActionState, useState } from "react";
import dynamic from "next/dynamic";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";
import type { Extension } from "@codemirror/state";
import { reviewProjectCodeAction, type CodeReviewState } from "@/lib/actions/projects";
import { MessageMarkdown } from "@/components/assistant/message-markdown";
import { useErrorToast } from "@/lib/use-error-toast";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

const LANGUAGES = ["Python", "JavaScript", "TypeScript", "Java", "C++"] as const;
const LANG_EXT: Record<string, () => Extension> = {
  Python: () => python(),
  JavaScript: () => javascript(),
  TypeScript: () => javascript({ typescript: true }),
  Java: () => java(),
  "C++": () => cpp(),
};

/**
 * Code help scoped to a project's own code — gated behind codingEnabledFor(user) by the caller
 * (the project page only renders this for coding-enabled students, mirroring the DSA/interview
 * coding-round gating).
 */
export function CodeHelp({ docId }: { docId: string }) {
  const [state, action, pending] = useActionState<CodeReviewState, FormData>(reviewProjectCodeAction, {});
  useErrorToast(state.error);
  const [language, setLanguage] = useState<string>("Python");
  const [code, setCode] = useState("");
  const ext = (LANG_EXT[language] ?? LANG_EXT.Python)();

  return (
    <div className="rounded-2xl border border-line bg-card p-6">
      <h2 className="font-display text-[15px] font-semibold text-ink">Code Help</h2>
      <p className="mt-0.5 text-[12px] text-muted">Paste code from your project and get feedback — bugs, edge cases, and suggested fixes.</p>

      <form action={action} className="mt-4">
        <input type="hidden" name="docId" value={docId} />
        <input type="hidden" name="code" value={code} />

        <div className="mb-3 flex items-center justify-between">
          <label className="text-[12.5px] font-semibold text-muted">Your code</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            name="language"
            className="rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[12px] text-soft outline-none focus:border-cyan/50"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        <div className="h-56 overflow-hidden rounded-xl border border-line-strong">
          <CodeMirror
            value={code}
            height="100%"
            style={{ height: "100%" }}
            theme={oneDark}
            extensions={[ext]}
            onChange={setCode}
            placeholder="Paste your code here…"
            basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, bracketMatching: true, closeBrackets: true }}
          />
        </div>

        <textarea
          name="question"
          rows={2}
          placeholder="What are you stuck on? (optional)"
          className="mt-3 w-full resize-none rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[13px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint"
        />

        {state.error ? (
          <div className="mt-3 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">{state.error}</div>
        ) : null}

        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="mt-3 w-full rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {pending ? "Reviewing…" : "Review my code →"}
        </button>
      </form>

      {state.reply ? (
        <div className="mt-4 rounded-xl border border-line bg-surface p-4">
          <MessageMarkdown content={state.reply} />
        </div>
      ) : null}
    </div>
  );
}
