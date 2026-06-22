import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { DSA_BY_SLUG, type DsaDifficulty } from "@/lib/dsa/catalog";
import { getLatestAttempt, type AttemptReview } from "@/lib/dsa/practice";
import { starterFor } from "@/lib/dsa/judging";
import { SolveEditor } from "@/components/dsa/solve-editor";

const DIFF_STYLE: Record<DsaDifficulty, string> = {
  easy: "text-success bg-success/12",
  medium: "text-warning bg-warning/12",
  hard: "text-danger bg-danger/12",
};

export default async function DsaProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireOnboardedUser();
  const problem = DSA_BY_SLUG[slug];
  if (!problem) notFound();

  const last = await getLatestAttempt(user.id, slug);
  const lastReview = (last?.review ?? null) as AttemptReview | null;
  const lastGrade = lastReview?.grade ?? null;
  const starters: Record<string, string> = {};
  for (const [label, lang] of [["Python", "python"], ["JavaScript", "javascript"], ["TypeScript", "typescript"]] as const) {
    const s = starterFor(slug, lang);
    if (s) starters[label] = s;
  }

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[820px]">
        <Link href="/dsa" className="text-[13px] text-muted transition-colors hover:text-soft">← All problems</Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[24px] font-bold leading-tight text-ink">{problem.title}</h1>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${DIFF_STYLE[problem.difficulty]}`}>{problem.difficulty}</span>
          {last?.solved ? <span className="rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-semibold text-success">✓ solved</span> : null}
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-card p-5">
          <p className="text-[13.5px] leading-relaxed text-soft">{problem.prompt}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {problem.tags.map((t) => (
              <span key={t} className="rounded-full border border-line-strong bg-surface px-2.5 py-0.5 text-[11.5px] text-muted">{t}</span>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {problem.examples.map((ex, i) => (
              <div key={i} className="rounded-lg bg-surface/50 p-3 font-mono text-[12px] text-soft">
                <p><span className="text-faint">Input:</span> {ex.input}</p>
                <p><span className="text-faint">Output:</span> {ex.output}</p>
                {ex.explanation ? <p className="text-faint">// {ex.explanation}</p> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <SolveEditor slug={slug} starters={starters} initialCode={last?.code} initialLanguage={last?.language ?? undefined} />
        </div>

        {lastGrade && lastGrade.total > 0 ? (
          <div className="mt-5 rounded-2xl border border-line bg-card p-5">
            <h2 className="font-display text-[15px] font-semibold text-ink">Your last result</h2>
            <p className="mt-2 text-[13px] text-soft">
              {lastGrade.verdict === "passed"
                ? `✓ Accepted — passed all ${lastGrade.total} tests in ${last?.language}.`
                : lastGrade.verdict === "failed"
                  ? `${lastGrade.passed}/${lastGrade.total} tests passed in ${last?.language}. Keep going — submit again above.`
                  : lastGrade.message ?? "Last run couldn't be verified."}
            </p>
            <p className="mt-3 text-[11px] text-faint">Solved is awarded only when all tests pass — your code is really executed.</p>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
