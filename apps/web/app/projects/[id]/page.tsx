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
  skipped: "text-muted bg-white/5",
};

function BundleRow({ label, href, item }: { label: string; href?: string; item?: BundleItem }) {
  const status = item?.status ?? "pending";
  const inner = (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card p-3.5">
      <span className="text-[13.5px] font-semibold text-ink">{label}</span>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[status] ?? "text-muted bg-white/5"}`}>
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
      <div className="mx-auto max-w-[820px]">
        <Link href="/projects" className="text-[13px] text-muted transition-colors hover:text-soft">← All projects</Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-[24px] font-bold leading-tight text-ink">{idea.title}</h1>
            <p className="mt-1 text-[13px] text-faint">
              {DIFFICULTY_LABELS[idea.difficulty] ?? idea.difficulty} · {idea.hardwareNeeded ? "Hardware project" : "Software project"}
            </p>
          </div>
          <AskAssistantButton projectId={id} title={idea.title} />
        </div>

        <div className="mt-5 rounded-2xl border border-line bg-card p-5">
          <p className="text-[13.5px] leading-relaxed text-soft">{idea.summary}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {idea.skills.map((s) => (
              <span key={s} className="rounded-full border border-line-strong bg-surface px-2.5 py-0.5 text-[11.5px] text-muted">{s}</span>
            ))}
          </div>
          {idea.hardwareNote ? <p className="mt-3 text-[12.5px] text-warning/90">⚙ {idea.hardwareNote}</p> : null}
          {description ? <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-muted"><span className="font-semibold text-soft">Your notes:</span> {description}</p> : null}
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold text-ink">Academic bundle</h2>
            <form action={generateBundleAction}>
              <input type="hidden" name="docId" value={id} />
              <button
                type="submit"
                className="rounded-xl bg-accent-gradient px-4 py-2 text-[13px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(34,211,238,0.3)] transition-transform hover:-translate-y-0.5"
              >
                {hasBundle ? "Regenerate bundle" : "Generate report + PPT + viva →"}
              </button>
            </form>
          </div>

          {hasBundle ? (
            <div className="flex flex-col gap-2.5">
              <BundleRow label="Report (with plagiarism / AI score)" href={bundle!.report?.docId ? `/reports/${bundle!.report.docId}` : undefined} item={bundle!.report} />
              <BundleRow label="Presentation (PPT)" href={bundle!.ppt?.docId ? `/ppt/${bundle!.ppt.docId}` : undefined} item={bundle!.ppt} />
              <BundleRow label="Viva questions" href={bundle!.viva?.docId ? `/viva/${bundle!.viva.docId}` : undefined} item={bundle!.viva} />
              {(bundle!.report?.error || bundle!.ppt?.error || bundle!.viva?.error) ? (
                <div className="rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-[12px] text-warning">
                  {[bundle!.report?.error, bundle!.ppt?.error, bundle!.viva?.error].filter(Boolean).join(" · ")}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-line-strong bg-card/50 p-5 text-center text-[13px] text-muted">
              Generate the full bundle from this project in one click — report, slide deck, and viva questions, all in your formats.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
