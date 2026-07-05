import Link from "next/link";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireStudentRoute, shellUserFrom } from "@/lib/user";
import { quotaStatus } from "@/lib/entitlements";
import { GenerateReportForm } from "@/components/reports/generate-report-form";
import { SlidesIcon } from "@/components/icons";
import { DeleteDocButton } from "@/components/delete-doc-button";

const STATUS_BADGE: Record<string, string> = {
  READY: "bg-success/12 text-success",
  GENERATING: "bg-cyan/12 text-cyan",
  NEEDS_INPUT: "bg-warning/15 text-warning",
  FAILED: "bg-danger/12 text-danger",
  DRAFT: "bg-surface text-muted",
};
const STATUS_LABEL: Record<string, string> = { READY: "Ready", GENERATING: "Generating", NEEDS_INPUT: "Input", FAILED: "Failed", DRAFT: "Draft", QUEUED: "Queued" };

export default async function ReportsPage() {
  const user = await requireStudentRoute();
  const [reports, quota] = await Promise.all([
    prisma.document.findMany({ where: { ownerId: user.id, type: "REPORT" }, orderBy: { updatedAt: "desc" }, take: 30 }),
    quotaStatus(user, "REPORT"),
  ]);

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1100px]">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[30px] font-semibold tracking-tight text-ink">Reports &amp; PPT</h1>
            <p className="mt-1 text-[14px] text-muted">Describe a report — we generate the content and render it into your college&apos;s locked format.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-line bg-card px-3 py-1.5 text-[12px]">
              {quota.limit === null ? <span className="font-semibold text-cyan">Unlimited</span> : <span className="text-muted"><span className="font-semibold text-ink">{quota.remaining}</span>/{quota.limit} free</span>}
            </span>
            <Link href="/ppt" className="text-[12.5px] font-semibold text-cyan hover:underline">Need slides? →</Link>
          </div>
        </div>

        {/* Generator (the form provides its own card) */}
        <div className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
            <span className="flex size-7 items-center justify-center rounded-lg bg-cyan/12 text-cyan">✦</span> New Report
          </h2>
          <GenerateReportForm />
        </div>

        {/* History grid */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-semibold text-ink">Your Reports</h2>
          <span className="text-[12.5px] text-muted">{reports.length}</span>
        </div>
        {reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-card p-12 text-center">
            <p className="text-[14px] text-muted">No reports yet.</p>
            <p className="mt-1 text-[12.5px] text-faint">Generate your first above — it&apos;ll appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((r) => (
              <div key={r.id} className="group relative rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-1 hover:border-cyan/40 hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]">
                <Link href={`/reports/${r.id}`} className="block">
                  <div className="mb-4 flex items-start justify-between">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-cyan/12 text-cyan"><SlidesIcon size={19} /></span>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_BADGE[r.status] ?? STATUS_BADGE.DRAFT}`}>{STATUS_LABEL[r.status] ?? "Draft"}</span>
                  </div>
                  <p className="line-clamp-2 text-[14.5px] font-semibold text-ink group-hover:text-cyan">{r.title}</p>
                  <p className="mt-2 text-[12px] text-muted">{new Date(r.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </Link>
                <div className="absolute right-2.5 top-2.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <DeleteDocButton docId={r.id} kind="report" compact />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
