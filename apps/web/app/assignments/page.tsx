import Link from "next/link";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { quotaStatus } from "@/lib/entitlements";
import { SolveAssignmentForm } from "@/components/assignments/solve-form";
import { PencilIcon } from "@/components/icons";

const STATUS_BADGE: Record<string, string> = {
  READY: "bg-success/12 text-success",
  GENERATING: "bg-cyan/12 text-cyan",
  NEEDS_INPUT: "bg-warning/15 text-warning",
  FAILED: "bg-danger/12 text-danger",
  DRAFT: "bg-surface text-muted",
};
const STATUS_LABEL: Record<string, string> = {
  READY: "Solved", GENERATING: "Solving", NEEDS_INPUT: "Input", FAILED: "Failed", DRAFT: "Draft", QUEUED: "Queued",
};

export default async function AssignmentsPage() {
  const user = await requireOnboardedUser();
  const [items, quota] = await Promise.all([
    prisma.document.findMany({ where: { ownerId: user.id, type: "ASSIGNMENT" }, orderBy: { updatedAt: "desc" }, take: 20 }),
    quotaStatus(user, "ASSIGNMENT"),
  ]);

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6">
          <h1 className="font-display text-[30px] font-semibold tracking-tight text-ink">Assignment Solver</h1>
          <p className="mt-1 text-[14px] text-muted">Upload questions or photos of your handwritten assignments. Our AI analyzes, solves, and explains the steps in real-time.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* Center — solver */}
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-[12px]">
              {quota.limit === null ? (
                <span className="font-semibold text-cyan">Unlimited assignments</span>
              ) : (
                <span className="text-muted"><span className="font-semibold text-ink">{quota.remaining}</span> of {quota.limit} free this month</span>
              )}
            </div>
            <SolveAssignmentForm />
          </div>

          {/* Right — current assignments */}
          <aside>
            <div className="rounded-2xl border border-line bg-card p-5">
              <h2 className="mb-4 font-display text-[15px] font-semibold text-ink">Current Assignments</h2>
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-surface/50 p-5 text-center text-[13px] text-muted">
                  Your solved assignments will appear here.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {items.map((d) => (
                    <Link key={d.id} href={`/assignments/${d.id}`} className="group flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-cyan/40">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger"><PencilIcon size={16} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink group-hover:text-cyan">{d.title}</p>
                        <p className="text-[11px] text-muted">{new Date(d.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                      </div>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_BADGE[d.status] ?? STATUS_BADGE.DRAFT}`}>{STATUS_LABEL[d.status] ?? "Draft"}</span>
                    </Link>
                  ))}
                </div>
              )}
              {items.length > 0 && (
                <Link href="/vault?type=ASSIGNMENT" className="mt-4 block text-center text-[12.5px] font-semibold text-cyan hover:underline">View All History</Link>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
