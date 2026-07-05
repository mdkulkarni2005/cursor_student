import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRecruiter } from "@/lib/recruiter";
import { NotAuthorized } from "@/components/not-authorized";
import { RecruiterShell } from "@/components/shell";
import { getJobPosting, listMatches } from "@/lib/job-postings";
import { findCandidates, selectCandidateForJob } from "@/app/jobs/actions";
import { MatchPoller } from "./match-poller";

export const metadata = { title: "Job posting — Recruiter" };

export default async function JobPostingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRecruiter();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const { id } = await params;
  const posting = await getJobPosting(id, guard.recruiter.id);
  if (!posting) notFound();

  const matches = await listMatches(id);
  const findCandidatesAction = findCandidates.bind(null, id);
  const isRunning = posting.matchStatus === "RUNNING";

  return (
    <RecruiterShell>
      {isRunning ? <MatchPoller /> : null}
      <div className="mb-5">
        <Link href="/jobs" className="text-[12.5px] text-muted hover:text-cyan">
          ← All postings
        </Link>
        <h1 className="mt-2 font-display text-[24px] font-bold text-ink">{posting.title}</h1>
        {posting.department ? <p className="mt-1 text-[13px] text-muted">{posting.department}</p> : null}
      </div>

      <div className="mb-6 rounded-2xl border border-line bg-card p-5">
        <h2 className="mb-2 font-display text-[16px] font-semibold text-ink">Job description</h2>
        <p className="whitespace-pre-wrap text-[13.5px] text-soft">{posting.description}</p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-[16px] font-semibold text-ink">Matched candidates</h2>
        <form action={findCandidatesAction}>
          <button
            type="submit"
            disabled={isRunning}
            className="rounded-xl border border-cyan/35 bg-cyan/10 px-4 py-2 text-[13px] font-semibold text-cyan hover:bg-cyan/15 disabled:opacity-60"
          >
            {isRunning ? "Scoring…" : matches.length === 0 ? "Find candidates" : "Refresh matches"}
          </button>
        </form>
      </div>

      {isRunning ? (
        <p className="mb-4 text-[12.5px] text-cyan">
          Scoring candidates in the background — this page updates on its own, feel free to navigate away and come back.
        </p>
      ) : posting.matchStatus === "FAILED" ? (
        <p className="mb-4 text-[12.5px] text-danger">
          Last scoring attempt failed{posting.matchError ? `: ${posting.matchError}` : "."} Try again above.
        </p>
      ) : (
        <p className="mb-4 text-[11.5px] text-faint">
          AI-estimated fit, recruiter-only — students never see this percentage. Recomputed only when you click above.
        </p>
      )}

      {matches.length === 0 && !isRunning ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center text-[13.5px] text-muted">
          No matches yet — click &ldquo;Find candidates&rdquo; to score visible students against this posting.
        </div>
      ) : matches.length > 0 ? (
        <div className="flex flex-col gap-3">
          {matches.map((m) => {
            const selectAction = selectCandidateForJob.bind(null, id, m.studentId);
            return (
              <div key={m.studentId} className="rounded-2xl border border-line bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/students/${m.studentId}`} className="text-[14.5px] font-semibold text-ink hover:text-cyan">
                      {m.name}
                    </Link>
                    {m.department ? <p className="text-[12px] text-muted">{m.department}</p> : null}
                    <p className="mt-1.5 text-[12.5px] text-soft">{m.rationale}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${matchTint(m.matchPercent)}`}>
                      {m.matchPercent}% match
                    </span>
                    <form action={selectAction}>
                      <button
                        type="submit"
                        className="rounded-lg bg-cyan px-3 py-1.5 text-[12px] font-semibold text-on-accent hover:opacity-90"
                      >
                        Select for interview
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </RecruiterShell>
  );
}

function matchTint(pct: number): string {
  if (pct >= 70) return "bg-success/10 text-success";
  if (pct >= 40) return "bg-warning/10 text-warning";
  return "bg-muted/10 text-muted";
}
