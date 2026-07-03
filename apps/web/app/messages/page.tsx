import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { ChatIcon } from "@/components/icons";
import { MarkMessageRead } from "@/components/messages/mark-read";
import { ScheduleResponse } from "@/components/messages/schedule-response";

export const metadata = { title: "Messages — Vidyas OS" };

const SCHEDULE_STATUS_LABEL: Record<string, string> = {
  PROPOSED: "Awaiting your response",
  ACCEPTED: "You accepted",
  DECLINED: "You declined",
  RESCHEDULE_REQUESTED: "You suggested another time",
  CANCELED: "Canceled by recruiter",
  COMPLETED: "Completed",
};

function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function MessagesPage() {
  const user = await requireOnboardedUser();

  const [messages, schedules] = await Promise.all([
    prisma.recruiterMessage.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: "desc" },
      include: { recruiter: { select: { name: true, companyName: true } } },
    }),
    prisma.interviewSchedule.findMany({
      where: { studentId: user.id },
      orderBy: { proposedAt: "desc" },
      include: { recruiter: { select: { name: true, companyName: true } } },
    }),
  ]);

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[760px]">
        <header className="mb-6">
          <h1 className="font-display text-[26px] font-bold text-ink">Messages</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Messages and interview requests from recruiters who matched to your profile. This only appears if
            you&apos;ve turned on &quot;Visible to recruiters&quot; in your profile.
          </p>
        </header>

        {schedules.length > 0 ? (
          <div className="mb-8">
            <h2 className="mb-3 font-display text-[15px] font-semibold text-ink">Interview requests</h2>
            <div className="flex flex-col gap-3">
              {schedules.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-2xl border p-4 ${s.status === "PROPOSED" ? "border-cyan/30 bg-cyan/[0.04]" : "border-line bg-card"}`}
                >
                  <p className="text-[14px] font-semibold text-ink">
                    {s.recruiter.companyName ?? "A recruiter"}
                    {s.recruiter.name ? <span className="font-normal text-muted"> · {s.recruiter.name}</span> : null}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-soft">Proposed: {fmtDateTime(s.proposedAt)}</p>
                  {s.note ? <p className="mt-1 text-[13px] text-soft">{s.note}</p> : null}
                  {s.status === "ACCEPTED" && s.meetingLink ? (
                    <a href={s.meetingLink} target="_blank" rel="noopener" className="mt-1 inline-block text-[13px] text-cyan hover:underline">
                      Join link: {s.meetingLink}
                    </a>
                  ) : null}
                  <p className="mt-1.5 text-[11px] font-medium text-faint">{SCHEDULE_STATUS_LABEL[s.status] ?? s.status}</p>
                  <ScheduleResponse id={s.id} status={s.status} />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <h2 className="mb-3 font-display text-[15px] font-semibold text-ink">Messages</h2>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-card p-12 text-center">
            <ChatIcon size={28} className="text-faint" />
            <p className="text-[13.5px] text-muted">No messages yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-2xl border p-4 ${m.readAt ? "border-line bg-card" : "border-cyan/30 bg-cyan/[0.04]"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-semibold text-ink">
                      {m.recruiter.companyName ?? "A recruiter"}
                      {m.recruiter.name ? <span className="font-normal text-muted"> · {m.recruiter.name}</span> : null}
                    </p>
                    <p className="mt-0.5 text-[11px] text-faint">{fmtDateTime(m.createdAt)}</p>
                  </div>
                  {!m.readAt && <MarkMessageRead id={m.id} />}
                </div>
                <p className="mt-2.5 whitespace-pre-wrap text-[13.5px] text-soft">{m.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
