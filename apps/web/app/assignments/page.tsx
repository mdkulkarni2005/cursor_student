import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { quotaStatus } from "@/lib/entitlements";
import { SolveAssignmentForm } from "@/components/assignments/solve-form";
import { DocumentRow } from "@/components/document-row";

export default async function AssignmentsPage() {
  const user = await requireOnboardedUser();
  const [items, quota] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: user.id, type: "ASSIGNMENT" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    quotaStatus(user, "ASSIGNMENT"),
  ]);

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto flex max-w-[1080px] flex-col gap-6 lg:flex-row">
        <div className="w-full lg:max-w-[440px]">
          <h1 className="font-display text-[22px] font-bold text-ink">Assignment Solver</h1>
          <p className="mb-4 mt-1.5 text-[14px] text-muted">
            Snap a photo or paste the question — get a clear, step-by-step worked solution.
          </p>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[12px]">
            {quota.limit === null ? (
              <span className="font-semibold text-cyan">Unlimited assignments</span>
            ) : (
              <span className="text-muted">
                <span className="font-semibold text-ink">{quota.remaining}</span> of {quota.limit} free
                assignments left this month
              </span>
            )}
          </div>
          <SolveAssignmentForm />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">Solved assignments</h2>
            <span className="text-[12.5px] text-faint">{items.length}</span>
          </div>
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-strong bg-card/50 p-10 text-center">
              <p className="text-[14px] text-muted">Nothing solved yet.</p>
              <p className="mt-1 text-[12.5px] text-faint">Your solved assignments will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {items.map((d) => (
                <DocumentRow key={d.id} doc={d} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
