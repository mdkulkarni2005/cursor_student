import Link from "next/link";
import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { JobRowActions } from "./job-row-actions";

export const metadata = { title: "Generation jobs — Admin" };

// A job with no worker to auto-recover it (docs/BUILD_ORDER.md Phase B2) sitting in
// QUEUED/GENERATING/NEEDS_INPUT this long is dead, not slow.
const STUCK_AFTER_MS = 15 * 60 * 1000;

function fmtDateTime(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStuckJobs() {
  const stuckCutoff = new Date(Date.now() - STUCK_AFTER_MS);

  return prisma.generationJob.findMany({
    where: {
      OR: [
        { status: "FAILED" },
        { status: { in: ["QUEUED", "RUNNING", "NEEDS_INPUT"] }, createdAt: { lt: stuckCutoff } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { document: { include: { owner: { select: { id: true, name: true, email: true } } } } },
  });
}

export default async function JobsPage() {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const jobs = await getStuckJobs();

  return (
    <>
      <div className="mb-5">
        <h1 className="font-display text-[26px] font-bold text-ink">Generation jobs</h1>
        <p className="mt-1 text-[15px] text-muted">
          {jobs.length} failed or stuck job{jobs.length === 1 ? "" : "s"} — the app has no background worker, so a
          job stuck &gt;15 min is dead, not slow. There&apos;s no in-app retry yet (students see &quot;try
          generating again&quot;); use this to clean up broken documents.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-[14.5px]">
          <thead className="border-b border-line text-[13px] uppercase tracking-wide text-faint">
            <tr>
              {["Document", "User", "Status", "Error", "Created", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => {
              const isStuck = j.status !== "FAILED";
              return (
                <tr key={j.id} className="border-b border-line/60 last:border-0 hover:bg-surface align-top">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-ink">{j.document.title || j.document.type}</p>
                    <p className="text-[13px] text-faint">{j.document.type}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/users/${j.document.owner.id}`} className="text-ink hover:text-cyan">
                      {j.document.owner.name ?? j.document.owner.email}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[13px] font-semibold ${
                        isStuck ? "bg-warning/12 text-warning" : "bg-danger/12 text-danger"
                      }`}
                    >
                      {isStuck ? `${j.status} (stuck)` : j.status}
                    </span>
                  </td>
                  <td className="max-w-[280px] px-3 py-2.5 text-faint">{j.error ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-faint">{fmtDateTime(j.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <JobRowActions jobId={j.id} documentId={j.documentId} isStuck={isStuck} />
                  </td>
                </tr>
              );
            })}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-faint">
                  No failed or stuck jobs. 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
