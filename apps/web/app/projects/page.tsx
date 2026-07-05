import Link from "next/link";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireStudentRoute, shellUserFrom } from "@/lib/user";
import { ProjectIdeasForm } from "@/components/projects/project-ideas-form";
import { IdeaCard } from "@/components/projects/idea-card";
import { getOrGeneratePregeneratedIdeas } from "@/lib/projects/generate";
import { refreshPregeneratedIdeasAction } from "@/lib/actions/projects";
import { NavSpinner, SubmitButton } from "@/components/ui/button";
import { DeleteDocButton } from "@/components/delete-doc-button";

export default async function ProjectsPage() {
  const user = await requireStudentRoute();
  const [projects, pregeneratedIdeas] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: user.id, type: "PROJECT" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getOrGeneratePregeneratedIdeas(user),
  ]);

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6">
          <h1 className="font-display text-[30px] font-semibold tracking-tight text-ink">Project Idea Catalyst</h1>
          <p className="mt-1 text-[14px] text-muted">Generate, curate, and finalize high-impact engineering projects with integrated planning.</p>
        </div>

        {/* Suggested for you — pregenerated from department + career goal, no asking required */}
        {pregeneratedIdeas.length > 0 ? (
          <div className="mb-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-[18px] font-semibold text-ink">Suggested for you</h2>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  Based on your profile{user.department ? ` (${user.department}${user.careerGoal ? ` · ${user.careerGoal}` : ""})` : ""}.
                </p>
              </div>
              <form action={refreshPregeneratedIdeasAction}>
                <SubmitButton loadingText="Refreshing…" className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-[12px] font-semibold text-muted transition-colors hover:border-cyan/40 hover:text-cyan disabled:opacity-60">
                  ↻ Refresh suggestions
                </SubmitButton>
              </form>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pregeneratedIdeas.map((idea, i) => (
                <IdeaCard key={i} idea={idea} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Idea Generator */}
        <div className="mb-8 rounded-2xl border border-line bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-cyan/12 text-cyan">✦</span>
            <h2 className="font-display text-[16px] font-semibold text-ink">Idea Generator</h2>
          </div>
          <ProjectIdeasForm />
        </div>

        {/* Suggested / saved concepts */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-semibold text-ink">Your Project Concepts</h2>
          <span className="text-[12.5px] text-muted">{projects.length}</span>
        </div>
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-card p-12 text-center">
            <p className="text-[14px] text-muted">No projects yet.</p>
            <p className="mt-1 text-[12.5px] text-faint">Use the generator above to create your first project bundle.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <div key={p.id} className="group relative rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-1 hover:border-cyan/40 hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]">
                <Link href={`/projects/${p.id}`} className="block">
                  <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-warning/15 text-[20px]">⚙</span>
                  <p className="line-clamp-2 text-[15px] font-semibold text-ink group-hover:text-cyan">{p.title}</p>
                  <p className="mt-2 text-[12px] text-muted">
                    Bundle · {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-cyan">
                    Open <NavSpinner className="text-cyan" /> →
                  </span>
                </Link>
                <div className="absolute right-2.5 top-2.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <DeleteDocButton docId={p.id} kind="project" compact />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
