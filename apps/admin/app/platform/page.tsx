import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { AdminShell } from "@/components/shell";
import { getPlatformCostSummary } from "@/lib/platform-cost";
import { getMaxConcurrentSessions } from "@/lib/sessions";
import { SessionLimitControl } from "./session-limit-control";

export const metadata = { title: "Platform — Admin" };

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function PlatformPage() {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const [summary, totalUsers, activeSubs, maxConcurrentSessions] = await Promise.all([
    getPlatformCostSummary(),
    prisma.user.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    getMaxConcurrentSessions(),
  ]);

  const gatewayOk = !("error" in summary.gateway);

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="font-display text-[24px] font-bold text-ink">Platform</h1>
        <p className="mt-1 text-[13px] text-muted">
          System-wide cost, capacity, and gateway credit visibility. AI spend is an estimate from token usage
          recorded per generation — the Gateway balance below is the authoritative total.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">AI Gateway balance</p>
          {gatewayOk ? (
            <>
              <p className="font-display text-[22px] font-bold text-ink">
                ${(summary.gateway as { balance: number }).balance.toFixed(2)}
              </p>
              <p className="text-[11px] text-faint">
                ${(summary.gateway as { totalUsed: number }).totalUsed.toFixed(2)} used lifetime
              </p>
            </>
          ) : (
            <p className="text-[13px] text-danger">{(summary.gateway as { error: string }).error}</p>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">AI spend (estimated)</p>
          <p className="font-display text-[22px] font-bold text-ink">{usd(summary.aiSpendCentsThisMonth)}</p>
          <p className="text-[11px] text-faint">this month · {usd(summary.aiSpendCentsAllTime)} all-time</p>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">Storage cost (estimated)</p>
          <p className="font-display text-[22px] font-bold text-ink">${summary.storageCostUsdPerMonth.toFixed(2)}/mo</p>
          <p className="text-[11px] text-faint">{(summary.storageBytes / 1024 ** 3).toFixed(2)} GB in R2</p>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">Concurrent active users</p>
          <p className="font-display text-[22px] font-bold text-ink">{summary.concurrentActiveUsers}</p>
          <p className="text-[11px] text-faint">seen in the last 5 minutes</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">Users</p>
          <p className="font-display text-[20px] font-bold text-ink">{totalUsers}</p>
          <p className="text-[11px] text-faint">total registered</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">Active subscriptions</p>
          <p className="font-display text-[20px] font-bold text-ink">{activeSubs}</p>
          <p className="text-[11px] text-faint">status = ACTIVE</p>
        </div>
      </div>

      <div className="mt-6">
        <SessionLimitControl initial={maxConcurrentSessions} />
      </div>
    </AdminShell>
  );
}
