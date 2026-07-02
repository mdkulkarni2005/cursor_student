import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { humanizeReportAction } from "@/lib/actions/humanize";
import { resumeReportAction } from "@/lib/actions/reports";
import { ClarifyQuestions } from "@/components/clarify-questions";
import { ReportEditor } from "@/components/reports/report-editor";
import { FigureSuggestions } from "@/components/reports/figure-suggestions";
import { FigureEditor, type ApprovedFigure } from "@/components/reports/figure-editor";
import { GeneratingPoller } from "@/components/reports/generating-poller";
import { FinishReportButton } from "@/components/reports/finish-report-button";
import { DeleteDocButton } from "@/components/delete-doc-button";
import { SubmitButton } from "@/components/ui/button";
import { REPORT_STAGES } from "@/lib/reports/generate";
import type { QualityMetrics } from "@/lib/quality";
import type { ClarifyQuestion } from "@studentos/ai";

type ReportData = {
  abstract?: string;
  sections?: { heading: string; content: string; image?: string; caption?: string; imageWidthPct?: number }[];
  references?: string[];
};

function QualityBadge({
  label,
  value,
  good,
  warn,
}: {
  label: string;
  value: number;
  good: number;
  warn: number;
}) {
  const cls =
    value <= good
      ? "text-success bg-success/12"
      : value <= warn
        ? "text-warning bg-warning/12"
        : "text-danger bg-danger/12";
  return (
    <span className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${cls}`}>
      {label} {value}%
    </span>
  );
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireOnboardedUser();

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "REPORT" },
    include: { content: true, exports: true, job: true, template: true },
  });
  if (!doc) notFound();

  const data = (doc.content?.data ?? {}) as ReportData;
  const hasExport = doc.exports.length > 0;
  const quality = (doc.quality as QualityMetrics | null) ?? null;
  const pendingQuestions =
    ((doc.job?.pending as { questions?: ClarifyQuestion[] } | null)?.questions) ?? [];
  const stage = ((doc.job?.pending as { stage?: string } | null)?.stage) ?? "draft";

  const wordCount = [data.abstract ?? "", ...(data.sections ?? []).map((s) => s.content)]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  const approvedFigures: ApprovedFigure[] = (data.sections ?? [])
    .map((s, sectionIndex) => ({ sectionIndex, heading: s.heading, caption: s.caption, imageWidthPct: s.imageWidthPct, image: s.image }))
    .filter((s) => !!s.image);

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="w-full">
        {/* Top bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/reports" className="text-[12.5px] text-muted transition-colors hover:text-cyan">← All reports</Link>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-cyan">Academic Submission</span>
            </div>
            <h1 className="font-display text-[22px] font-bold leading-tight text-ink">{doc.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {doc.status === "READY" && hasExport ? (
              <a href={`/reports/${doc.id}/download`} className="flex items-center gap-1.5 rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5">
                ⬆ Export
              </a>
            ) : null}
            <DeleteDocButton docId={doc.id} kind="report" />
          </div>
        </div>

        {doc.status === "NEEDS_INPUT" && pendingQuestions.length > 0 ? (
          <form action={resumeReportAction} className="rounded-2xl border border-cyan/25 bg-cyan/[0.06] p-5">
            <input type="hidden" name="docId" value={doc.id} />
            <p className="font-display text-[15px] font-semibold text-ink">A few details to finish your report</p>
            <p className="mb-4 mt-1 text-[13px] text-muted">We drafted what we could from your topic — answer these and we&apos;ll complete it.</p>
            <ClarifyQuestions questions={pendingQuestions} />
            <FinishReportButton />
          </form>
        ) : doc.status === "GENERATING" ? (
          <GeneratingPoller stages={REPORT_STAGES} current={stage} />
        ) : doc.status === "FAILED" ? (
          <div className="rounded-xl border border-danger/25 bg-danger/10 p-4 text-[13.5px] text-danger">
            Generation failed: {doc.job?.error ?? "unknown error"}. Try generating again.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
            {/* Center — document editor */}
            <div className="min-w-0">
              <ReportEditor docId={doc.id} initial={data} editable={doc.status === "READY"} hasExport={hasExport} />
              {/* Status bar */}
              <div className="mt-3 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-card px-4 py-2.5 text-[12px] text-muted">
                <span>{wordCount} words</span>
                <span className="text-line-strong">·</span>
                <span>Reading level: Graduate</span>
                <span className="ml-auto flex items-center gap-1.5 text-teal">
                  <span className="size-1.5 rounded-full bg-teal" /> AI Connected
                </span>
              </div>
            </div>

            {/* Right — AI Assistant rail */}
            <aside className="space-y-4">
              <div className="rounded-2xl border border-line bg-card p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-cyan/12 text-cyan">✦</span>
                  <h2 className="font-display text-[15px] font-semibold text-ink">AI Assistant</h2>
                </div>

                {/* Quality — real metrics */}
                {doc.status === "READY" && quality ? (
                  <div className="mb-4 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Integrity</p>
                    <div className="flex flex-wrap gap-2">
                      <QualityBadge label="AI" value={quality.aiScore} good={10} warn={25} />
                      <QualityBadge label="Plagiarism" value={quality.plagiarismScore} good={5} warn={15} />
                    </div>
                    {quality.humanized ? (
                      <span className="inline-block rounded-full bg-success/12 px-3 py-1.5 text-[12px] font-semibold text-success">✓ Humanized</span>
                    ) : (
                      <form action={humanizeReportAction}>
                        <input type="hidden" name="docId" value={doc.id} />
                        <SubmitButton loadingText="Humanizing…" className="w-full rounded-xl border border-cyan/30 bg-cyan/5 px-3.5 py-2 text-[12.5px] font-semibold text-cyan transition-colors hover:bg-cyan/10 disabled:opacity-60">
                          Humanize text ↓
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                ) : null}

                {/* Template/context info */}
                <div className="space-y-1 border-t border-line pt-4 text-[12.5px] text-muted">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Format</p>
                  <p className="text-soft">{doc.template?.name ?? "Standard report template"}</p>
                  <p className="text-faint">
                    Created {new Date(doc.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Already-approved figures — preview, crop, resize, delete */}
              {doc.status === "READY" ? <FigureEditor docId={doc.id} figures={approvedFigures} /> : null}

              {/* AI figure approval flow — generates images only on approval (default report format) */}
              {doc.status === "READY" ? <FigureSuggestions docId={doc.id} /> : null}

              {/* Convert to PPT — real cross-tool action lives on /reports already; link */}
              <Link href="/reports" className="block rounded-2xl border border-line bg-card p-5 transition-colors hover:border-cyan/40">
                <p className="text-[13.5px] font-semibold text-ink">Turn this into a deck →</p>
                <p className="mt-0.5 text-[12px] text-muted">Generate a presentation from this report.</p>
              </Link>
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}
