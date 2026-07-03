import Link from "next/link";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { GenerateResumeForm } from "@/components/resume/generate-resume-form";
import { ImportResumeForm } from "@/components/resume/import-resume-form";
import { ResumeIcon } from "@/components/icons";

const STATUS_BADGE: Record<string, string> = {
  READY: "bg-success/12 text-success",
  GENERATING: "bg-cyan/12 text-cyan",
  FAILED: "bg-danger/12 text-danger",
  DRAFT: "bg-surface text-muted",
};

export default async function ResumePage() {
  const user = await requireOnboardedUser();
  const resumes = await prisma.document.findMany({ where: { ownerId: user.id, type: "RESUME" }, orderBy: { updatedAt: "desc" }, take: 30 });

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6">
          <h1 className="font-display text-[30px] font-semibold tracking-tight text-ink">Resume Builder</h1>
          <p className="mt-1 text-[14px] text-muted">ATS-friendly resume in a recruiter-ready format. You bring the content — we write strong bullets and lock the layout.</p>
        </div>

        {/* Generator (forms provide their own cards) */}
        <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
              <span className="flex size-7 items-center justify-center rounded-lg bg-cyan/12 text-cyan">✦</span> New Resume
            </h2>
            <GenerateResumeForm defaults={{ name: user.name ?? undefined, email: user.email }} />
          </div>
          <div>
            <h2 className="mb-3 font-display text-[16px] font-semibold text-ink">Import existing</h2>
            <ImportResumeForm />
          </div>
        </div>

        {/* History grid */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-semibold text-ink">Your Resumes</h2>
          <span className="text-[12.5px] text-muted">{resumes.length}</span>
        </div>
        {resumes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-card p-12 text-center">
            <p className="text-[14px] text-muted">No resumes yet.</p>
            <p className="mt-1 text-[12.5px] text-faint">Generate your first above — it&apos;ll appear here, editable.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((d) => (
              <Link key={d.id} href={`/resume/${d.id}`} className="group rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-1 hover:border-cyan/40 hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]">
                <div className="mb-4 flex items-start justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-teal/12 text-teal"><ResumeIcon size={19} /></span>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_BADGE[d.status] ?? STATUS_BADGE.DRAFT}`}>{d.status === "READY" ? "Ready" : d.status === "GENERATING" ? "Generating" : "Draft"}</span>
                </div>
                <p className="line-clamp-2 text-[14.5px] font-semibold text-ink group-hover:text-cyan">{d.title}</p>
                <p className="mt-2 text-[12px] text-muted">{new Date(d.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
