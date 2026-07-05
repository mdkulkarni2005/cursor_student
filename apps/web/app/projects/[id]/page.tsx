import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireStudentRoute, shellUserFrom } from "@/lib/user";
import { getProject, type BundleItem } from "@/lib/projects/generate";
import { generateBundleAction, generatePlanAction } from "@/lib/actions/projects";
import { DIFFICULTY_LABELS } from "@/components/projects/idea-card";
import { AskAssistantButton } from "@/components/projects/ask-assistant-button";
import { MermaidDiagram } from "@/components/projects/mermaid-diagram";
import { ProjectImage } from "@/components/projects/project-image";
import { CodeHelp } from "@/components/projects/code-help";
import { codingEnabledFor } from "@/lib/capabilities";
import { SubmitButton } from "@/components/ui/button";

/** Real, always-valid links built from the research topic — never a model-invented URL. */
function researchLinks(query: string): { label: string; href: string }[] {
  const q = encodeURIComponent(query);
  return [
    { label: "Search", href: `https://www.google.com/search?q=${q}` },
    { label: "YouTube", href: `https://www.youtube.com/results?search_query=${q}` },
  ];
}

const STATUS_STYLE: Record<string, string> = {
  ready: "text-success bg-success/12",
  needs_input: "text-warning bg-warning/12",
  failed: "text-danger bg-danger/12",
  skipped: "text-muted bg-surface",
};

function BundleRow({ label, icon, href, item }: { label: string; icon: string; href?: string; item?: BundleItem }) {
  const status = item?.status ?? "pending";
  const inner = (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card p-4 transition-colors hover:border-cyan/40">
      <span className="flex items-center gap-3 text-[13.5px] font-semibold text-ink">
        <span className="flex size-9 items-center justify-center rounded-lg bg-cyan/10 text-[16px]">{icon}</span>
        {label}
      </span>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_STYLE[status] ?? "text-muted bg-surface"}`}>
        {status.replace("_", " ")}
      </span>
    </div>
  );
  return href && item?.docId && item.status === "ready" ? <Link href={href}>{inner}</Link> : inner;
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStudentRoute();
  const project = await getProject(user.id, id);
  if (!project) notFound();

  const { idea, description, bundle, breakdown: rawBreakdown } = project.content;
  const hasBundle = !!bundle && (bundle.report || bundle.ppt || bundle.viva);
  // Older persisted build plans predate problemStatement/solution/images — default them so
  // opening a project built before that change doesn't crash the page.
  const breakdown = rawBreakdown
    ? {
        ...rawBreakdown,
        problemStatement: rawBreakdown.problemStatement ?? "",
        solution: rawBreakdown.solution ?? "",
        images: rawBreakdown.images ?? [],
      }
    : null;

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1080px]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href="/projects" className="text-[12.5px] text-muted transition-colors hover:text-cyan">← All projects</Link>
            <h1 className="mt-1 font-display text-[26px] font-bold leading-tight text-ink">{idea.title}</h1>
            <p className="mt-1 text-[13px] text-muted">
              {DIFFICULTY_LABELS[idea.difficulty] ?? idea.difficulty} · {idea.hardwareNeeded ? "Hardware project" : "Software project"}
            </p>
          </div>
          <AskAssistantButton projectId={id} title={idea.title} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left — overview */}
          <div className="rounded-2xl border border-line bg-card p-6">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Overview</h2>
            <p className="text-[14px] leading-relaxed text-soft">{idea.summary}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {idea.skills.map((s) => (
                <span key={s} className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11.5px] text-muted">{s}</span>
              ))}
            </div>
            {idea.hardwareNote ? <p className="mt-4 rounded-lg bg-warning/10 px-3 py-2 text-[12.5px] text-warning">⚙ {idea.hardwareNote}</p> : null}
            {description ? <p className="mt-4 border-t border-line pt-4 text-[13px] text-muted"><span className="font-semibold text-soft">Your notes:</span> {description}</p> : null}
          </div>

          {/* Right — academic bundle */}
          <aside>
            <div className="rounded-2xl border border-line bg-card p-5">
              <h2 className="mb-1 font-display text-[15px] font-semibold text-ink">Academic Bundle</h2>
              <p className="mb-4 text-[12px] text-muted">Generate report, slide deck, and viva questions from this project in one click — all in your formats.</p>
              {hasBundle ? (
                <div className="mb-4 flex flex-col gap-2.5">
                  <BundleRow label="Report" icon="📄" href={bundle!.report?.docId ? `/reports/${bundle!.report.docId}` : undefined} item={bundle!.report} />
                  <BundleRow label="Presentation" icon="📊" href={bundle!.ppt?.docId ? `/ppt/${bundle!.ppt.docId}` : undefined} item={bundle!.ppt} />
                  <BundleRow label="Viva questions" icon="🎓" href={bundle!.viva?.docId ? `/viva/${bundle!.viva.docId}` : undefined} item={bundle!.viva} />
                  {(bundle!.report?.error || bundle!.ppt?.error || bundle!.viva?.error) ? (
                    <div className="rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-[12px] text-warning">
                      {[bundle!.report?.error, bundle!.ppt?.error, bundle!.viva?.error].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <form action={generateBundleAction}>
                <input type="hidden" name="docId" value={id} />
                <SubmitButton loadingText="Generating…" className="w-full rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5 disabled:opacity-60">
                  {hasBundle ? "Regenerate bundle" : "Generate bundle →"}
                </SubmitButton>
              </form>
            </div>
          </aside>
        </div>

        {/* Build plan — diagrams, phased implementation, components, research, differentiators */}
        <div className="mt-6 rounded-2xl border border-line bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-[15px] font-semibold text-ink">Build Plan</h2>
              <p className="mt-0.5 text-[12px] text-muted">
                The full how-to: system diagrams, a phased plan, required components, research material, and what makes your build stand out.
              </p>
            </div>
            <form action={generatePlanAction}>
              <input type="hidden" name="docId" value={id} />
              <SubmitButton loadingText="Generating…" className="rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5 disabled:opacity-60">
                {breakdown ? "Regenerate build plan" : "Generate build plan →"}
              </SubmitButton>
            </form>
          </div>

          {breakdown && !breakdown.problemStatement && !breakdown.solution && breakdown.images.length === 0 ? (
            <div className="mb-4 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-[12.5px] text-warning">
              This build plan was made before problem/solution and illustrations were added — click &ldquo;Regenerate build plan&rdquo; above to get them.
            </div>
          ) : null}

          {breakdown ? (
            <div className="flex flex-col gap-6">
              {breakdown.problemStatement || breakdown.solution ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {breakdown.problemStatement ? (
                    <div className="rounded-xl border border-line bg-surface p-4">
                      <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Problem statement</h3>
                      <p className="text-[13px] leading-relaxed text-soft">{breakdown.problemStatement}</p>
                    </div>
                  ) : null}
                  {breakdown.solution ? (
                    <div className="rounded-xl border border-line bg-surface p-4">
                      <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Solution</h3>
                      <p className="text-[13px] leading-relaxed text-soft">{breakdown.solution}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {breakdown.images.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Illustrations</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {breakdown.images.map((img, i) => (
                      <ProjectImage key={img.key} docId={id} idx={i} label={img.label} />
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Diagrams (click to zoom)</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {breakdown.diagrams.map((d) => (
                    <MermaidDiagram key={d.label} label={d.label} mermaid={d.mermaid} />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Implementation phases</h3>
                <div className="flex flex-col gap-3">
                  {breakdown.phases.map((p, i) => (
                    <div key={p.name} className="rounded-xl border border-line bg-surface p-4">
                      <p className="text-[13.5px] font-semibold text-ink">{i + 1}. {p.name}</p>
                      <p className="mt-1 text-[12.5px] text-muted">{p.description}</p>
                      <ul className="mt-2 flex flex-col gap-1">
                        {p.tasks.map((t) => (
                          <li key={t} className="text-[12.5px] text-soft">☐ {t}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Components</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {breakdown.components.map((c) => (
                    <div key={c.name} className="rounded-xl border border-line bg-surface p-3.5">
                      <p className="text-[13px] font-semibold text-ink">{c.name}</p>
                      <p className="mt-0.5 text-[12px] text-muted">{c.purpose}</p>
                      <p className="mt-1 text-[11.5px] text-cyan">{c.tech}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Research material</h3>
                <ul className="flex flex-col gap-2">
                  {breakdown.research.map((r) => (
                    <li key={r.topic} className="rounded-lg bg-surface px-3.5 py-2.5 text-[12.5px] text-soft">
                      <span className="font-semibold text-ink">{r.topic}</span> — {r.why}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-faint">&ldquo;{r.searchQuery}&rdquo;</span>
                        {researchLinks(r.searchQuery).map((l) => (
                          <a
                            key={l.label}
                            href={l.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-line-strong bg-card px-2.5 py-0.5 text-[11px] font-semibold text-cyan transition-colors hover:bg-cyan/10"
                          >
                            {l.label} ↗
                          </a>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">What makes this stand out</h3>
                <ul className="flex flex-col gap-1.5">
                  {breakdown.differentiators.map((d) => (
                    <li key={d} className="text-[12.5px] text-soft">✦ {d}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>

        {codingEnabledFor(user) ? (
          <div className="mt-6">
            <CodeHelp docId={id} />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
