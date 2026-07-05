import Link from "next/link";
import { requireRecruiter } from "@/lib/recruiter";
import { NotAuthorized } from "@/components/not-authorized";
import { RecruiterShell } from "@/components/shell";
import { listJobPostings } from "@/lib/job-postings";

export const metadata = { title: "Jobs — Recruiter" };

export default async function JobsPage() {
  const guard = await requireRecruiter();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const postings = await listJobPostings(guard.recruiter.id);

  return (
    <RecruiterShell>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[24px] font-bold text-ink">Job postings</h1>
          <p className="mt-1 text-[13px] text-muted">
            Create a posting, then let AI rank visible students against it before you decide who to interview.
          </p>
        </div>
        <Link href="/jobs/new" className="shrink-0 rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent">
          New posting
        </Link>
      </div>

      {postings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center text-[13.5px] text-muted">
          No job postings yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {postings.map((p) => (
            <Link
              key={p.id}
              href={`/jobs/${p.id}`}
              className="rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-1 hover:border-cyan/40"
            >
              <p className="text-[15px] font-semibold text-ink">{p.title}</p>
              {p.department ? <p className="mt-1 text-[12.5px] text-muted">{p.department}</p> : null}
              <p className="mt-2 line-clamp-2 text-[12px] text-faint">{p.description}</p>
              <span
                className={`mt-3 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  p.status === "OPEN" ? "bg-success/10 text-success" : "bg-muted/10 text-muted"
                }`}
              >
                {p.status === "OPEN" ? "Open" : "Closed"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </RecruiterShell>
  );
}
