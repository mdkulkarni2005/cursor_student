import Link from "next/link";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { ProjectIdeasForm } from "@/components/projects/project-ideas-form";
import { NavSpinner } from "@/components/ui/button";
import { DeleteDocButton } from "@/components/delete-doc-button";

export default async function ProjectsPage() {
  const user = await requireOnboardedUser();
  const projects = await prisma.document.findMany({
    where: { ownerId: user.id, type: "PROJECT" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const intro = (
    <>
      <h1 className="font-display text-[22px] font-bold text-ink">Project Ideas & Builder</h1>
      <p className="mb-4 mt-1.5 text-[14px] text-muted">
        Get department-matched ideas, compare them, finalize one — then generate the whole bundle
        (report, PPT, viva questions) from it.
      </p>
    </>
  );

  return (
    <AppShell user={shellUserFrom(user)}>
      {projects.length === 0 ? (
        <div className="mx-auto max-w-[560px]">
          {intro}
          <ProjectIdeasForm />
        </div>
      ) : (
        <div className="mx-auto flex max-w-[1080px] flex-col gap-6 lg:flex-row">
          <div className="w-full lg:max-w-[460px] lg:sticky lg:top-0 lg:self-start">
            {intro}
            <ProjectIdeasForm />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-ink">Your projects</h2>
              <span className="text-[12.5px] text-faint">{projects.length}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {projects.map((p) => (
                <div key={p.id} className="group relative">
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-3.5 rounded-xl border border-line bg-card p-3.5 pr-12 transition-colors hover:border-cyan/30"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/12 text-[18px]">⚙</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink">{p.title}</p>
                      <p className="text-[12px] text-faint">
                        Project · {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <NavSpinner className="text-cyan" />
                  </Link>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    <DeleteDocButton docId={p.id} kind="project" compact />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
