import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRecruiter } from "@/lib/recruiter";
import { NotAuthorized } from "@/components/not-authorized";
import { RecruiterShell } from "@/components/shell";
import { listFlagsForSchedule } from "@/lib/interview-flags";
import { prisma } from "@studentos/db";
import { FlagList } from "./flag-list";
import { JoinPanel } from "./join-panel";
import { CandidateLobbyMonitor } from "./candidate-lobby-monitor";

export const metadata = { title: "Interview — Recruiter" };

export default async function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRecruiter();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const { id } = await params;
  const schedule = await prisma.interviewSchedule.findUnique({
    where: { id },
    include: { student: { select: { id: true, name: true } } },
  });
  if (!schedule || schedule.recruiterId !== guard.recruiter.id) notFound();

  const flags = await listFlagsForSchedule(id, guard.recruiter.id);
  // schedule.recruiterId already checked above (notFound() otherwise), so this query is safe.
  const judgment = await prisma.interviewJudgment.findUnique({ where: { scheduleId: id } });
  const room = await prisma.interviewRoom.findUnique({
    where: { scheduleId: id },
    select: { candidateReadyAt: true, admittedAt: true, candidateChecks: true },
  });

  const VERDICT_LABEL: Record<string, string> = {
    strong_fit: "Strong fit",
    fit: "Fit",
    weak_fit: "Weak fit",
    not_fit: "Not a fit",
  };

  return (
    <RecruiterShell>
      <div className="mb-5">
        <Link href="/interviews" className="text-[12.5px] text-muted hover:text-cyan">
          ← All interviews
        </Link>
        <h1 className="mt-2 font-display text-[24px] font-bold text-ink">
          Interview with {schedule.student.name ?? "Student"}
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          {new Date(schedule.proposedAt).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" })}
          {" · "}
          Status: {schedule.status}
        </p>
      </div>

      {schedule.status === "ACCEPTED" ? (
        <>
          {!room?.admittedAt && (
            <CandidateLobbyMonitor
              scheduleId={id}
              initialCandidateReadyAt={room?.candidateReadyAt?.toISOString() ?? null}
              initialAdmittedAt={null}
              initialChecks={
                (room?.candidateChecks as { fullscreen: boolean; monitorCount: number | null } | null) ?? null
              }
            />
          )}
          <JoinPanel scheduleId={id} />
        </>
      ) : (
        <div className="mb-6 rounded-2xl border border-dashed border-line bg-card p-5 text-[13px] text-muted">
          {schedule.status === "PROPOSED" && "Waiting for the student to accept this proposal before you can join."}
          {schedule.status === "RESCHEDULE_REQUESTED" && "The student asked for a different time — accept a new slot before joining."}
          {schedule.status === "DECLINED" && "The student declined this interview."}
          {schedule.status === "CANCELED" && "This interview was canceled."}
          {schedule.status === "COMPLETED" && "This interview has already been completed."}
        </div>
      )}

      {judgment && (
        <div className="mb-6 rounded-2xl border border-line bg-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-[16px] font-semibold text-ink">AI-assisted summary</h2>
            <div className="flex items-center gap-2">
              {typeof judgment.score === "number" && (
                <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-[11.5px] font-semibold text-ink">
                  {judgment.score}/10
                </span>
              )}
              <span className="rounded-full bg-cyan/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-cyan">
                {VERDICT_LABEL[judgment.fitVerdict] ?? judgment.fitVerdict}
              </span>
            </div>
          </div>
          <p className="mb-3 text-[11px] text-faint">AI-assisted, not the decision — you make the final call.</p>
          <p className="mb-3 text-[13.5px] text-soft">{judgment.summary}</p>
          {Array.isArray(judgment.strengths) && judgment.strengths.length > 0 && (
            <div className="mb-2">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-faint">Strengths</p>
              <ul className="mt-1 list-disc pl-4 text-[13px] text-soft">
                {(judgment.strengths as string[]).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(judgment.concerns) && judgment.concerns.length > 0 && (
            <div className="mb-2">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-faint">Concerns</p>
              <ul className="mt-1 list-disc pl-4 text-[13px] text-soft">
                {(judgment.concerns as string[]).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-3 text-[12.5px] text-muted">{judgment.recommendation}</p>
        </div>
      )}

      <FlagList scheduleId={id} initialFlags={flags ?? []} />
    </RecruiterShell>
  );
}
