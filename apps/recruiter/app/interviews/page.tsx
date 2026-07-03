import Link from "next/link";
import { requireRecruiter } from "@/lib/recruiter";
import { NotAuthorized } from "@/components/not-authorized";
import { RecruiterShell } from "@/components/shell";
import { listRecruiterSchedules } from "@/lib/interview-schedule";
import { ScheduleRow } from "./schedule-row";

export const metadata = { title: "Interviews — Recruiter" };

function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default async function InterviewsPage() {
  const guard = await requireRecruiter();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const schedules = await listRecruiterSchedules(guard.recruiter.id);

  return (
    <RecruiterShell>
      <div className="mb-5">
        <h1 className="font-display text-[24px] font-bold text-ink">Interviews</h1>
        <p className="mt-1 text-[13px] text-muted">
          Real interviews you&apos;ve proposed to students. Video happens on whatever link you shared — this just
          tracks scheduling and outcome.
        </p>
      </div>

      {schedules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center text-[13.5px] text-muted">
          No interviews scheduled yet. Propose one from a student&apos;s profile.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-line text-[11px] uppercase tracking-wide text-faint">
              <tr>
                {["Student", "When", "Join", "Note", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} className="border-b border-line/60 align-top last:border-0 hover:bg-surface">
                  <td className="px-3 py-2.5">
                    <Link href={`/students/${s.studentId}`} className="font-medium text-ink hover:text-cyan">{s.studentName}</Link>
                    {s.studentNote ? <p className="mt-0.5 text-[11px] text-faint">Student: {s.studentNote}</p> : null}
                  </td>
                  <td className="px-3 py-2.5 text-soft">{fmtDateTime(s.proposedAt)}</td>
                  <td className="px-3 py-2.5">
                    {s.status === "ACCEPTED" ? (
                      <Link href={`/interviews/${s.id}`} className="font-semibold text-cyan hover:underline">
                        Join call
                      </Link>
                    ) : (
                      <span className="text-faint">Not accepted yet</span>
                    )}
                    {s.meetingLink ? (
                      <a href={s.meetingLink} target="_blank" rel="noopener" className="mt-0.5 block text-[11px] text-muted hover:underline">
                        Backup link
                      </a>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-soft">{s.note ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <ScheduleRow id={s.id} status={s.status} proposedAt={s.proposedAt.getTime()} />
                    <Link href={`/interviews/${s.id}`} className="mt-1 block text-[11px] text-cyan hover:underline">
                      View flags
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </RecruiterShell>
  );
}
