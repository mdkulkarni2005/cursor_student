import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { humanizeReportAction } from "@/lib/actions/humanize";
import { resumeReportAction } from "@/lib/actions/reports";
import { ClarifyQuestions } from "@/components/clarify-questions";
import { ReportEditor } from "@/components/reports/report-editor";
import { GeneratingPoller } from "@/components/reports/generating-poller";
import { FinishReportButton } from "@/components/reports/finish-report-button";
import { DeleteDocButton } from "@/components/delete-doc-button";
import { REPORT_STAGES } from "@/lib/reports/generate";
import type { QualityMetrics } from "@/lib/quality";
import type { ClarifyQuestion } from "@studentos/ai";

type ReportData = {
  abstract?: string;
  sections?: { heading: string; content: string }[];
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

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="w-full">
        <Link href="/reports" className="text-[13px] text-muted transition-colors hover:text-soft">
          ← All reports
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-[24px] font-bold leading-tight text-ink">{doc.title}</h1>
            <p className="mt-1 text-[13px] text-faint">
              {doc.template?.name ?? "Report"} ·{" "}
              {new Date(doc.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {doc.status === "READY" && hasExport ? (
              <a
                href={`/reports/${doc.id}/download`}
                className="rounded-xl bg-accent-gradient px-4 py-2.5 text-[13.5px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(34,211,238,0.3)] transition-transform hover:-translate-y-0.5"
              >
                Download DOCX
              </a>
            ) : null}
            <DeleteDocButton docId={doc.id} kind="report" />
          </div>
        </div>

        {doc.status === "NEEDS_INPUT" && pendingQuestions.length > 0 ? (
          <form
            action={resumeReportAction}
            className="mt-6 rounded-2xl border border-cyan/25 bg-cyan/[0.06] p-5"
          >
            <input type="hidden" name="docId" value={doc.id} />
            <p className="font-display text-[15px] font-semibold text-ink">
              A few details to finish your report
            </p>
            <p className="mb-4 mt-1 text-[13px] text-muted">
              We drafted what we could from your topic — answer these and we&apos;ll complete it.
            </p>
            <ClarifyQuestions questions={pendingQuestions} />
            <FinishReportButton />
          </form>
        ) : null}

        {doc.status === "READY" && quality ? (
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <QualityBadge label="AI detected" value={quality.aiScore} good={10} warn={25} />
            <QualityBadge label="Plagiarism" value={quality.plagiarismScore} good={5} warn={15} />
            {quality.humanized ? (
              <span className="rounded-full bg-success/12 px-3 py-1.5 text-[12px] font-semibold text-success">
                ✓ Humanized
              </span>
            ) : (
              <form action={humanizeReportAction}>
                <input type="hidden" name="docId" value={doc.id} />
                <button
                  type="submit"
                  className="rounded-full border border-cyan/35 bg-cyan/10 px-3.5 py-1.5 text-[12px] font-semibold text-cyan transition-colors hover:bg-cyan/20"
                >
                  Humanize ↓
                </button>
              </form>
            )}
          </div>
        ) : null}

        {doc.status === "GENERATING" ? (
          <GeneratingPoller stages={REPORT_STAGES} current={stage} />
        ) : doc.status === "FAILED" ? (
          <div className="mt-6 rounded-xl border border-danger/25 bg-danger/10 p-4 text-[13.5px] text-danger">
            Generation failed: {doc.job?.error ?? "unknown error"}. Try generating again.
          </div>
        ) : doc.status === "NEEDS_INPUT" ? null : (
          <ReportEditor docId={doc.id} initial={data} editable={doc.status === "READY"} hasExport={hasExport} />
        )}
      </div>
    </AppShell>
  );
}
