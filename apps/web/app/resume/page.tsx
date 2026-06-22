import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { GenerateResumeForm } from "@/components/resume/generate-resume-form";
import { ImportResumeForm } from "@/components/resume/import-resume-form";
import { DocumentRow } from "@/components/document-row";

export default async function ResumePage() {
  const user = await requireOnboardedUser();
  const resumes = await prisma.document.findMany({
    where: { ownerId: user.id, type: "RESUME" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto flex max-w-[1080px] flex-col gap-6 lg:flex-row">
        <div className="w-full lg:max-w-[460px]">
          <h1 className="font-display text-[22px] font-bold text-ink">Resume Builder</h1>
          <p className="mb-4 mt-1.5 text-[14px] text-muted">
            ATS-friendly resume in a proven, recruiter-ready format. You bring the content — we write the
            strong bullets and lock the layout so it never breaks.
          </p>
          <GenerateResumeForm defaults={{ name: user.name ?? undefined, email: user.email }} />
          <div className="mt-3">
            <ImportResumeForm />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">Your resumes</h2>
            <span className="text-[12.5px] text-faint">{resumes.length}</span>
          </div>
          {resumes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-strong bg-card/50 p-10 text-center">
              <p className="text-[14px] text-muted">No resumes yet.</p>
              <p className="mt-1 text-[12.5px] text-faint">Generate your first — it&apos;ll appear here, editable.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {resumes.map((d) => (
                <DocumentRow key={d.id} doc={d} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
