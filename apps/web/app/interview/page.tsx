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
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6">
          <h1 className="font-display text-[30px] font-semibold tracking-tight text-ink">Interview Prep</h1>
          <p className="mt-1 text-[14px] text-muted">A realistic mock interview — technical, behavioral, and a coding round — grounded in your resume, with an honest evaluation at the end.</p>
        </div>

        {/* Start a round (the form provides its own card) */}
        <div className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
            <span className="flex size-7 items-center justify-center rounded-lg bg-indigo/15 text-indigo">🎤</span> New Mock Interview
          </h2>
          <StartInterviewForm resumes={resumes} codingEnabled={user.codingEnabled !== false} />
        </div>

        {/* History grid */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-semibold text-ink">Your Interviews</h2>
          <span className="text-[12.5px] text-muted">{interviews.length}</span>
        </div>
        {interviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-card p-12 text-center">
            <p className="text-[14px] text-muted">No interviews yet.</p>
            <p className="mt-1 text-[12.5px] text-faint">Start one above — it&apos;ll appear here with your score.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {interviews.map((iv) => (
              <Link key={iv.id} href={`/interview/${iv.id}`} className="group rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-1 hover:border-cyan/40 hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]">
                <div className="mb-4 flex items-start justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-indigo/15 text-[18px]">🎤</span>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${iv.status === "READY" ? "bg-success/12 text-success" : "bg-cyan/12 text-cyan"}`}>{iv.status === "GENERATING" ? "Thinking" : iv.status === "READY" ? "Done" : "Open"}</span>
                </div>
                <p className="line-clamp-2 text-[14.5px] font-semibold text-ink group-hover:text-cyan">{iv.title}</p>
                <p className="mt-2 text-[12px] text-muted">{new Date(iv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
