import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { PlanTierPicker } from "./plan-tier-picker";
import { AccountOps } from "./account-ops";
import { SetBreadcrumb } from "@/components/set-breadcrumb";
import { RecruiterRow } from "../recruiter-row";

export const metadata = { title: "Recruiter — Admin" };

function fmtDateTime(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: "text-warning bg-warning/12",
  APPROVED: "text-success bg-success/12",
  REJECTED: "text-danger bg-danger/12",
};

const SUB_STATUS_STYLE: Record<string, string> = {
  ACTIVE: "text-success bg-success/12",
  PAST_DUE: "text-warning bg-warning/12",
  CANCELED: "text-faint bg-surface",
  EXPIRED: "text-danger bg-danger/12",
};

function periodStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function RecruiterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const { id } = await params;

  const recruiter = await prisma.recruiter.findUnique({
    where: { id },
    include: {
      subscription: { include: { planTier: { select: { id: true, name: true } } } },
      payments: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!recruiter) notFound();

  const [usageByKindAll, usageByKindPeriod, jobPostingCount, tiersForAudience] = await Promise.all([
    prisma.recruiterUsageEvent.groupBy({ by: ["kind"], where: { recruiterId: id }, _count: { _all: true } }),
    prisma.recruiterUsageEvent.groupBy({ by: ["kind"], where: { recruiterId: id, createdAt: { gte: periodStart() } }, _count: { _all: true } }),
    prisma.jobPosting.count({ where: { recruiterId: id } }),
    prisma.planTier.findMany({
      where: { audience: "RECRUITER", active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, isFree: true },
    }),
  ]);

  const periodCountByKind = Object.fromEntries(usageByKindPeriod.map((r) => [r.kind, r._count._all]));

  // An ACTIVE paid RecruiterSubscription with its own planTierId always outranks a manual grant
  // (see getActiveRecruiterPlanTier's precedence) — lock the picker in that case.
  const lockedByActiveSubscription = recruiter.subscription?.status === "ACTIVE" && !!recruiter.subscription.planTierId;
  const currentTierId = lockedByActiveSubscription ? recruiter.subscription!.planTierId : recruiter.subscription?.planTierId ?? null;
  const resolvedTierName =
    (lockedByActiveSubscription ? recruiter.subscription?.planTier?.name : tiersForAudience.find((t) => t.id === currentTierId)?.name) ??
    (currentTierId ? null : tiersForAudience.find((t) => t.isFree)?.name ?? "Free");

  return (
    <>
      <SetBreadcrumb label={recruiter.name ?? recruiter.email} />
      <Link href="/recruiters" className="mb-4 inline-block text-[14.5px] font-medium text-cyan hover:underline">
        ← All recruiters
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[26px] font-bold text-ink">{recruiter.name ?? "Unnamed"}</h1>
            <span className={`rounded-full px-2 py-0.5 text-[13px] font-semibold ${STATUS_STYLE[recruiter.status]}`}>
              {recruiter.status}
            </span>
            {recruiter.suspended && (
              <span className="rounded-full bg-danger/12 px-2 py-0.5 text-[13px] font-semibold text-danger">suspended</span>
            )}
          </div>
          <p className="mt-1 text-[15px] text-muted">{recruiter.email}</p>
          <p className="text-[14px] text-faint">{recruiter.companyName ?? "—"}</p>
        </div>
        {recruiter.status === "APPROVED" ? (
          <PlanTierPicker
            recruiterId={recruiter.id}
            tiers={tiersForAudience}
            currentTierId={currentTierId}
            locked={!!lockedByActiveSubscription}
            lockedTierName={recruiter.subscription?.planTier?.name}
          />
        ) : (
          <RecruiterRow id={recruiter.id} />
        )}
      </div>

      {recruiter.status === "APPROVED" && (
        <div className="mb-6">
          <AccountOps recruiterId={recruiter.id} suspended={recruiter.suspended} />
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-faint">Profile</p>
          <dl className="space-y-1.5 text-[15px]">
            <div className="flex justify-between"><dt className="text-muted">Company</dt><dd className="text-ink">{recruiter.companyName ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Industry</dt><dd className="text-ink">{recruiter.industry ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Designation</dt><dd className="text-ink">{recruiter.designation ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Phone</dt><dd className="text-ink">{recruiter.phone ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Approved</dt><dd className="text-ink">{fmtDateTime(recruiter.approvedAt)}</dd></div>
          </dl>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-faint">Payment status</p>
          {recruiter.subscription ? (
            <dl className="space-y-1.5 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-muted">Status</dt>
                <dd>
                  <span className={`rounded-full px-2 py-0.5 text-[13px] font-semibold ${SUB_STATUS_STYLE[recruiter.subscription.status]}`}>
                    {recruiter.subscription.status}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between"><dt className="text-muted">Plan tier</dt><dd className="text-ink">{recruiter.subscription.planTier?.name ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Next payment</dt><dd className="text-ink">{fmtDateTime(recruiter.subscription.currentPeriodEnd)}</dd></div>
              <div className="flex justify-between">
                <dt className="text-muted">Autopay</dt>
                <dd className="text-ink">
                  {recruiter.subscription.razorpaySubId && !recruiter.subscription.cancelAtPeriodEnd ? "On" : "Off"}
                </dd>
              </div>
              <div className="flex justify-between"><dt className="text-muted">Razorpay sub</dt><dd className="text-ink">{recruiter.subscription.razorpaySubId ?? "—"}</dd></div>
            </dl>
          ) : (
            <p className="text-[15px] text-faint">No subscription record — recruiter is on {resolvedTierName ?? "the default free tier"} (manual grant / default, no billing history).</p>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-faint">Activity</p>
          <dl className="space-y-1.5 text-[15px]">
            <div className="flex justify-between"><dt className="text-muted">Job postings</dt><dd className="text-ink">{jobPostingCount}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Joined</dt><dd className="text-ink">{fmtDateTime(recruiter.createdAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Suspended</dt><dd className="text-ink">{recruiter.suspended ? `Yes (${fmtDateTime(recruiter.suspendedAt)})` : "No"}</dd></div>
          </dl>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-line bg-card p-4">
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-faint">Usage (job postings / candidate contacts)</p>
        <div className="grid grid-cols-2 gap-3">
          {["JOB_POSTING", "CANDIDATE_CONTACT"].map((kind) => {
            const all = usageByKindAll.find((r) => r.kind === kind)?._count._all ?? 0;
            const period = periodCountByKind[kind] ?? 0;
            return (
              <div key={kind} className="rounded-xl border border-line/60 bg-surface p-3">
                <p className="text-[13px] font-medium text-faint">{kind.replace("_", " ")}</p>
                <p className="font-display text-[22px] font-bold text-ink">{period}</p>
                <p className="text-[13px] text-faint">this month · {all} all-time</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-faint">Payment history</p>
        {recruiter.payments.length === 0 ? (
          <p className="text-[15px] text-faint">No payments recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-[15px]">
            {recruiter.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between border-b border-line/60 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="text-ink">
                    {p.currency} {(p.amountCents / 100).toFixed(2)} · {p.method ?? "—"}
                  </p>
                  <p className="text-[13px] text-faint">{fmtDateTime(p.createdAt)} · {p.razorpayPaymentId}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[13px] font-semibold ${
                    p.status === "CAPTURED"
                      ? "text-success bg-success/12"
                      : p.status === "REFUNDED"
                        ? "text-faint bg-surface"
                        : "text-danger bg-danger/12"
                  }`}
                >
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
