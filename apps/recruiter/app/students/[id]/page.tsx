import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRecruiter } from "@/lib/recruiter";
import { NotAuthorized } from "@/components/not-authorized";
import { RecruiterShell } from "@/components/shell";
import { getStudentDetail } from "@/lib/student-profile";
import { listSchedulesForStudent, joinWindowState } from "@/lib/interview-schedule";
import { MessageForm } from "./message/message-form";
import { ScheduleForm } from "./schedule/schedule-form";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRecruiter();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const { id } = await params;
  const student = await getStudentDetail(id);
  if (!student) notFound();
  const schedules = await listSchedulesForStudent(guard.recruiter.id, id);
  // Exactly one schedule should ever be ACCEPTED per pair (see scheduleInterview/
  // rescheduleInterview, which supersede/replace old rows in place) — this is the single
  // unambiguous "Join interview" entry point, rather than making the recruiter guess which of
  // several rows in a list is the current one. Shown even when not joinable yet/anymore, with a
  // clear reason, rather than silently disappearing (which reads as "there's nothing scheduled").
  const acceptedSchedule = schedules.find((s) => s.status === "ACCEPTED");
  const acceptedWindow = acceptedSchedule ? joinWindowState(acceptedSchedule.status, acceptedSchedule.proposedAt) : null;

  const initials = student.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <RecruiterShell>
      <div className="mx-auto max-w-[900px]">
        <div className="rounded-2xl border border-line bg-card p-6 sm:p-8">
          <div className="flex items-center gap-5">
            <span className="flex size-20 items-center justify-center rounded-2xl bg-cyan/12 font-display text-[26px] font-bold text-cyan">
              {initials}
            </span>
            <div>
              <h1 className="font-display text-[24px] font-bold text-ink">{student.name}</h1>
              <p className="mt-1 text-[14px] text-muted">
                {student.careerGoal ?? "Student"}
                {student.department ? ` · ${student.department}` : ""}
                {student.semester ? ` · Sem ${student.semester}` : ""}
              </p>
              {student.institution ? <p className="mt-0.5 text-[12.5px] text-faint">{student.institution}</p> : null}
              <div className="mt-2 flex gap-3 text-[12.5px]">
                {student.links.github ? <a href={normalize(student.links.github)} target="_blank" rel="noopener" className="text-muted hover:text-cyan">GitHub</a> : null}
                {student.links.linkedin ? <a href={normalize(student.links.linkedin)} target="_blank" rel="noopener" className="text-muted hover:text-cyan">LinkedIn</a> : null}
                {student.links.portfolio ? <a href={normalize(student.links.portfolio)} target="_blank" rel="noopener" className="text-muted hover:text-cyan">Portfolio</a> : null}
              </div>
            </div>
            {acceptedSchedule && acceptedWindow === "joinable" ? (
              <Link
                href={`/interviews/${acceptedSchedule.id}`}
                className="ml-auto shrink-0 rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform active:scale-[0.97]"
              >
                Join interview
              </Link>
            ) : acceptedSchedule && acceptedWindow === "too-early" ? (
              <span className="ml-auto shrink-0 text-[12.5px] text-faint">
                Interview opens 15 min before {fmtDateTime(acceptedSchedule.proposedAt)}
              </span>
            ) : acceptedSchedule && acceptedWindow === "expired" ? (
              <span className="ml-auto shrink-0 text-[12.5px] text-faint">Interview window passed — propose a new time</span>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-6 sm:grid-cols-4">
            <Stat label="DSA Solved" value={String(student.dsaSolved)} tint="text-teal" />
            <Stat label="Interviews Taken" value={String(student.interviewStats.count)} tint="text-indigo" />
            <Stat label="Avg Interview Score" value={student.interviewStats.avgScore !== null ? `${student.interviewStats.avgScore}/100` : "—"} tint="text-cyan" />
            <Stat label="Skills Listed" value={String(student.skills.length)} tint="text-warning" />
          </div>
        </div>

        {student.skills.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 font-display text-[16px] font-semibold text-ink">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {student.skills.map((s) => (
                <span key={s} className="rounded-full bg-cyan/10 px-3 py-1 text-[12px] font-medium text-cyan">{s}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-3 font-display text-[16px] font-semibold text-ink">Projects</h2>
            {student.projects.length === 0 ? (
              <p className="text-[13px] text-muted">No projects listed.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {student.projects.map((p) => (
                  <div key={p.id} className="rounded-xl border border-line bg-card p-4 text-[13.5px] font-medium text-ink">{p.title}</div>
                ))}
              </div>
            )}
            {student.resume ? (
              <p className="mt-3 text-[12.5px] text-muted">Resume on file — {student.interviewStats.count} mock interview{student.interviewStats.count === 1 ? "" : "s"} completed.</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <h2 className="mb-3 font-display text-[16px] font-semibold text-ink">Message</h2>
              <MessageForm studentId={student.id} />
            </div>

            <div>
              <h2 className="mb-3 font-display text-[16px] font-semibold text-ink">Schedule real interview</h2>
              <ScheduleForm studentId={student.id} />
              {schedules.length > 0 ? (
                <div className="mt-4 flex flex-col gap-2">
                  {schedules.map((s) => (
                    <div key={s.id} className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[12.5px]">
                      <p className="font-semibold text-ink">{fmtDateTime(s.proposedAt)} — {STATUS_LABEL[s.status] ?? s.status}</p>
                      {s.studentNote ? <p className="mt-0.5 text-faint">Student note: {s.studentNote}</p> : null}
                      {s.outcome ? <p className="mt-0.5 text-faint">Outcome: {s.outcome}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </RecruiterShell>
  );
}

const STATUS_LABEL: Record<string, string> = {
  PROPOSED: "Awaiting response",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  RESCHEDULE_REQUESTED: "Reschedule requested",
  CANCELED: "Canceled",
  COMPLETED: "Completed",
};

function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function Stat({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div>
      <p className={`font-display text-[22px] font-bold ${tint}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function normalize(v: string): string {
  const s = v.trim().replace(/^@/, "");
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}
