import Link from "next/link";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireStudentRoute, shellUserFrom } from "@/lib/user";
import { quotaStatus } from "@/lib/entitlements";
import { GeneratePptForm } from "@/components/ppt/generate-ppt-form";
import { ConvertReportToPpt } from "@/components/ppt/convert-report-to-ppt";
import { DocumentRow } from "@/components/document-row";

export default async function PptPage() {
  const user = await requireStudentRoute();
  const [decks, reports, quota] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: user.id, type: "PPT" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.document.findMany({
      where: { ownerId: user.id, type: "REPORT", status: "READY" },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, title: true },
    }),
    quotaStatus(user, "PPT"),
  ]);

  const isEmpty = decks.length === 0;

  const intro = (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[22px] font-bold text-ink">PPT Generator</h1>
        <Link href="/reports" className="text-[12.5px] font-semibold text-cyan">
          Need a report? →
        </Link>
      </div>
      <p className="mb-4 mt-1.5 text-[14px] text-muted">
        Turn a topic into a full slide deck with speaker notes.
      </p>
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[12px]">
        {quota.limit === null ? (
          <span className="font-semibold text-cyan">Unlimited PPTs</span>
        ) : (
          <span className="text-muted">
            <span className="font-semibold text-ink">{quota.remaining}</span> of {quota.limit} free
            PPTs left this month
          </span>
        )}
      </div>
    </>
  );

  // No decks yet → the form takes the whole screen.
  if (isEmpty) {
    return (
      <AppShell user={await shellUserFrom(user)}>
        <div className="mx-auto max-w-[560px]">
          {intro}
          <GeneratePptForm />
          <ConvertReportToPpt reports={reports} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto flex max-w-[1080px] flex-col gap-6 lg:flex-row">
        <div className="w-full lg:max-w-[420px] lg:sticky lg:top-0 lg:self-start">
          {intro}
          <GeneratePptForm />
          <ConvertReportToPpt reports={reports} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">Your presentations</h2>
            <span className="text-[12.5px] text-faint">{decks.length}</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {decks.map((d) => (
              <DocumentRow key={d.id} doc={d} />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
