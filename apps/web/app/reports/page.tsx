import Link from "next/link";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { quotaStatus } from "@/lib/entitlements";
import { GenerateReportForm } from "@/components/reports/generate-report-form";
import { SlidesIcon } from "@/components/icons";
import { NavSpinner } from "@/components/ui/button";
import { DeleteDocButton } from "@/components/delete-doc-button";

const STATUS_STYLE: Record<string, string> = {
  READY: "text-success bg-success/12",
  GENERATING: "text-cyan bg-cyan/12",
  QUEUED: "text-muted bg-white/5",
  FAILED: "text-danger bg-danger/12",
  DRAFT: "text-muted bg-white/5",
};

export default async function ReportsPage() {
  const user = await requireOnboardedUser();
  const [reports, quota] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: user.id, type: "REPORT" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    quotaStatus(user, "REPORT"),
  ]);

  const isEmpty = reports.length === 0;

  const intro = (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[22px] font-bold text-ink">Report Generator</h1>
        <Link href="/ppt" className="text-[12.5px] font-semibold text-cyan">
          Need slides? →
        </Link>
      </div>
      <p className="mb-4 mt-1.5 text-[14px] text-muted">
        Describe the report — we generate the content and render it into your college&apos;s
        locked format.
      </p>
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[12px]">
        {quota.limit === null ? (
          <span className="font-semibold text-cyan">Unlimited reports</span>
        ) : (
          <span className="text-muted">
            <span className="font-semibold text-ink">{quota.remaining}</span> of {quota.limit}{" "}
            free reports left this month
          </span>
        )}
      </div>
    </>
  );

  // No reports yet → the form takes the whole screen (no empty list beside it).
  if (isEmpty) {
    return (
      <AppShell user={shellUserFrom(user)}>
        <div className="mx-auto max-w-[560px]">
          {intro}
          <GenerateReportForm />
        </div>
      </AppShell>
    );
  }

  // Has reports → sticky form on the left, scrolling history on the right.
  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto flex max-w-[1080px] flex-col gap-6 lg:flex-row">
        {/* Generate (sticky) */}
        <div className="w-full lg:max-w-[420px] lg:sticky lg:top-0 lg:self-start">
          {intro}
          <GenerateReportForm />
        </div>

        {/* History */}
        <div className="min-w-0 flex-1">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">Your reports</h2>
            <span className="text-[12.5px] text-faint">{reports.length}</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {reports.map((r) => (
              <div key={r.id} className="group relative">
                <Link
                  href={`/reports/${r.id}`}
                  className="flex items-center gap-3.5 rounded-xl border border-line bg-card p-3.5 pr-12 transition-colors hover:border-cyan/30"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan/12">
                    <SlidesIcon size={19} className="text-cyan" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{r.title}</p>
                    <p className="text-[12px] text-faint">
                      {new Date(r.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <NavSpinner className="text-cyan" />
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-opacity group-hover:opacity-0 ${STATUS_STYLE[r.status] ?? "text-muted bg-white/5"}`}
                  >
                    {r.status.toLowerCase()}
                  </span>
                </Link>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <DeleteDocButton docId={r.id} kind="report" compact />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
