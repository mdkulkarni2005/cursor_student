import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { FeedbackRow } from "./feedback-row";

export const metadata = { title: "Feedback — Admin" };

// NEW/REVIEWED/PLANNED first so open items float to the top; DONE/DISMISSED sink.
const STATUS_RANK: Record<string, number> = { NEW: 0, REVIEWED: 1, PLANNED: 2, DONE: 3, DISMISSED: 4 };

export default async function FeedbackPage() {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const feedback = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { id: true, name: true, email: true } },
      recruiter: { select: { id: true, name: true, companyName: true, email: true } },
    },
  });

  feedback.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);

  const openCount = feedback.filter((f) => f.status === "NEW" || f.status === "REVIEWED" || f.status === "PLANNED").length;

  return (
    <>
      <div className="mb-5">
        <h1 className="font-display text-[26px] font-bold text-ink">Feedback</h1>
        <p className="mt-1 text-[15px] text-muted">
          {openCount} item{openCount === 1 ? "" : "s"} needing triage, out of {feedback.length} total. Bug reports,
          feature requests, and general feedback submitted from the always-on widget across the student and recruiter
          apps.
        </p>
      </div>

      {feedback.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center text-[15px] text-faint">
          No feedback yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {feedback.map((f) => {
            const from =
              f.requesterType === "STUDENT"
                ? `${f.student?.name ?? "Student"} · ${f.student?.email ?? "—"}`
                : `${f.recruiter?.companyName ?? f.recruiter?.name ?? "Recruiter"} · ${f.recruiter?.email ?? "—"}`;
            return (
              <FeedbackRow
                key={f.id}
                id={f.id}
                from={from}
                type={f.type}
                page={f.page}
                message={f.message}
                status={f.status}
                adminNote={f.adminNote}
                createdAt={f.createdAt}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
