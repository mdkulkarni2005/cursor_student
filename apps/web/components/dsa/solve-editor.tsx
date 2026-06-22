"use client";

import { useActionState, useState } from "react";
import dynamic from "next/dynamic";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";
import type { Extension } from "@codemirror/state";
import { submitAttemptAction, type AttemptFormState } from "@/lib/actions/dsa";
import { Button } from "@/components/ui/button";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

const LANGUAGES = ["Python", "JavaScript", "TypeScript", "Java", "C++"] as const;
const LANG_EXT: Record<string, () => Extension> = {
  Python: () => python(),
  JavaScript: () => javascript(),
  TypeScript: () => javascript({ typescript: true }),
  Java: () => java(),
  "C++": () => cpp(),
};

export function SolveEditor({
  slug,
  starters,
  initialCode,
  initialLanguage,
}: {
  slug: string;
  /** Per-language starter stubs (label → code). Missing = language not auto-graded yet. */
  starters: Record<string, string>;
  initialCode?: string;
  initialLanguage?: string;
}) {
  const [state, action, pending] = useActionState<AttemptFormState, FormData>(submitAttemptAction, {});
  const startLang = initialLanguage && (LANGUAGES as readonly string[]).includes(initialLanguage) ? initialLanguage : "Python";
  const [language, setLanguage] = useState<string>(startLang);
  const [code, setCode] = useState<string>(initialCode ?? starters[startLang] ?? "");

  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);

  const allStarters = Object.values(starters);
  function onLanguageChange(next: string) {
    setLanguage(next);
    // If the box is untouched (empty or still a starter), swap in the new language's starter.
    if (code.trim() === "" || allStarters.includes(code)) {
      setCode(starters[next] ?? "");
    }
  }

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

  const review = state.review;
  const grade = review?.grade;
  const supported = starters[language] !== undefined;
  const ext = (LANG_EXT[language] ?? LANG_EXT.Python)();

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="rounded-2xl border border-line bg-card p-4">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="language" value={language} />
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="text-[12.5px] font-semibold text-muted">
            Your solution — implement <code className="font-mono text-cyan">solve(...)</code>
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

        <div className="overflow-hidden rounded-xl border border-line-strong">
          <CodeMirror
            value={code}
            height="320px"
            theme={oneDark}
            extensions={[ext]}
            onChange={setCode}
            placeholder="Write your solution here…"
            basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, highlightActiveLine: true, bracketMatching: true, closeBrackets: true, indentOnInput: true }}
          />
        </div>

        {hint ? (
          <div className="mt-3 rounded-xl border border-warning/30 bg-warning/[0.07] px-3.5 py-2.5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-warning">💡 Hint</p>
            <p className="text-[13px] leading-relaxed text-soft">{hint}</p>
          </div>
        ) : null}
        {hintError ? <p className="mt-2 text-[11.5px] text-warning">{hintError}</p> : null}

        {!supported ? (
          <p className="mt-2 text-[11.5px] text-warning">
            Auto-grading for {language} is coming soon — you can still submit and we&apos;ll save your attempt.
          </p>
        ) : (
          <p className="mt-2 text-[11.5px] text-faint">We run your code against hidden test cases and grade it for real.</p>
        )}

        {state.error ? (
          <div className="mt-3 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[12px] text-danger">{state.error}</div>
        ) : null}

        <Button
          type="submit"
          loading={pending}
          loadingText="Running your code…"
          disabled={code.trim().length < 10}
          className="mt-3 w-full rounded-xl bg-accent-gradient py-2.5 text-[13.5px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(34,211,238,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          Run &amp; submit →
        </Button>
      </form>

      {grade ? <Verdict review={review!} /> : null}
    </div>
  );
}

function Verdict({ review }: { review: NonNullable<AttemptFormState["review"]> }) {
  const { grade, aiReview } = review;

  const banner =
    grade.verdict === "passed"
      ? { cls: "border-success/30 bg-success/10 text-success", label: `✓ Accepted — ${grade.passed}/${grade.total} tests passed 🎉` }
      : grade.verdict === "failed"
        ? { cls: "border-danger/30 bg-danger/10 text-danger", label: `✗ ${grade.passed}/${grade.total} tests passed` }
        : { cls: "border-warning/30 bg-warning/10 text-warning", label: grade.message ?? "Couldn't run your code" };

  const firstFail = grade.outcomes.find((o) => !o.passed);

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className={`rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold ${banner.cls}`}>{banner.label}</div>

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

      {aiReview ? (
        <div className="mt-4 border-t border-line pt-4">
          <h3 className="text-[13px] font-semibold text-ink">Coach&apos;s feedback</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-lg bg-surface px-3 py-1.5 text-[12px] text-soft"><span className="text-faint">Time:</span> <span className="font-mono">{aiReview.timeComplexity}</span></span>
            <span className="rounded-lg bg-surface px-3 py-1.5 text-[12px] text-soft"><span className="text-faint">Space:</span> <span className="font-mono">{aiReview.spaceComplexity}</span></span>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-soft">{aiReview.feedback}</p>
          {aiReview.suggestions.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {aiReview.suggestions.map((s, i) => (
                <li key={i} className="flex gap-1.5 text-[12.5px] text-soft"><span className="text-cyan">→</span>{s}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
