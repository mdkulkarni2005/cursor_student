import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { DSA_BY_SLUG, type DsaDifficulty } from "@/lib/dsa/catalog";
import { getLatestAttempt, type AttemptReview } from "@/lib/dsa/practice";
import { starterFor, sampleTests } from "@/lib/dsa/judging";
import { SolveWorkspace } from "@/components/dsa/solve-workspace";

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
  // Only the visible sample tests reach the client — hidden tests stay server-side.
  const samples = sampleTests(slug);

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link href="/dsa" className="text-[12.5px] text-muted transition-colors hover:text-cyan">← Problems</Link>
          <span className="text-line-strong">·</span>
          <h1 className="font-display text-[22px] font-bold leading-tight text-ink">{problem.title}</h1>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${DIFF_STYLE[problem.difficulty]}`}>{problem.difficulty}</span>
          {last?.solved ? <span className="rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-semibold text-success">✓ solved</span> : null}
        </div>

        {lastGrade && lastGrade.total > 0 ? (
          <div className="mb-4 rounded-xl border border-line bg-card px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Last result: </span>
            <span className="text-[13px] text-soft">
              {lastGrade.verdict === "passed"
                ? `✓ Accepted — passed all ${lastGrade.total} tests in ${last?.language}.`
                : lastGrade.verdict === "failed"
                  ? `${lastGrade.passed}/${lastGrade.total} tests passed in ${last?.language}.`
                  : lastGrade.message ?? "Last run couldn't be verified."}
            </span>
          </div>
        ) : null}

        <SolveWorkspace
          slug={slug}
          problem={problem}
          starters={starters}
          samples={samples}
          initialCode={last?.code}
          initialLanguage={last?.language ?? undefined}
        />
      </div>
    </AppShell>
  );
}
