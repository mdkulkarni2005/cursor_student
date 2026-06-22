import Link from "next/link";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { StartInterviewForm } from "@/components/interview/start-interview-form";

export default async function InterviewPage() {
  const user = await requireOnboardedUser();
  const [interviews, resumes] = await Promise.all([
    prisma.document.findMany({ where: { ownerId: user.id, type: "INTERVIEW" }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.document.findMany({ where: { ownerId: user.id, type: "RESUME" }, orderBy: { createdAt: "desc" }, select: { id: true, title: true }, take: 10 }),
  ]);

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto flex max-w-[1080px] flex-col gap-6 lg:flex-row">
        <div className="w-full lg:max-w-[440px]">
          <h1 className="font-display text-[22px] font-bold text-ink">Interview Prep</h1>
          <p className="mb-4 mt-1.5 text-[14px] text-muted">
            A realistic mock interview — technical, behavioral, and a coding round — grounded in your resume.
            You answer; at the end you get an honest evaluation with where to improve.
          </p>
          <StartInterviewForm resumes={resumes} codingEnabled={user.codingEnabled !== false} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">Your interviews</h2>
            <span className="text-[12.5px] text-faint">{interviews.length}</span>
          </div>
          {interviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-strong bg-card/50 p-10 text-center">
              <p className="text-[14px] text-muted">No interviews yet.</p>
              <p className="mt-1 text-[12.5px] text-faint">Start one and it&apos;ll appear here with your score.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {interviews.map((iv) => (
                <Link
                  key={iv.id}
                  href={`/interview/${iv.id}`}
                  className="flex items-center gap-3.5 rounded-xl border border-line bg-card p-3.5 transition-colors hover:border-cyan/30"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo/12 text-[18px]">🎤</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{iv.title}</p>
                    <p className="text-[12px] text-faint">
                      Interview · {new Date(iv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${iv.status === "READY" ? "text-success bg-success/12" : "text-cyan bg-cyan/12"}`}>
                    {iv.status === "GENERATING" ? "thinking" : "open"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
