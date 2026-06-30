import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { getProject, type BundleItem } from "@/lib/projects/generate";
import { generateBundleAction } from "@/lib/actions/projects";
import { DIFFICULTY_LABELS } from "@/components/projects/project-ideas-form";
import { AskAssistantButton } from "@/components/projects/ask-assistant-button";

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
  const user = await requireOnboardedUser();
  const project = await getProject(user.id, id);
  if (!project) notFound();

  const { idea, description, bundle } = project.content;
  const hasBundle = !!bundle && (bundle.report || bundle.ppt || bundle.viva);

  return (
    <AppShell user={shellUserFrom(user)}>
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
                <button type="submit" className="w-full rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5">
                  {hasBundle ? "Regenerate bundle" : "Generate bundle →"}
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
