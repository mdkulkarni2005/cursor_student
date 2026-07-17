import Link from "next/link";
import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";

export const metadata = { title: "Overview — Admin" };

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

const PLAN_STYLE: Record<string, string> = {
  FREE: "text-muted bg-surface",
  PRO: "text-cyan bg-cyan/12",
  PREMIUM: "text-indigo bg-indigo/12",
};

const PLAN_BAR: Record<string, string> = {
  FREE: "bg-dim",
  PRO: "bg-cyan",
  PREMIUM: "bg-indigo",
};

const KIND_LABEL: Record<string, string> = { ASSIGNMENT: "Assignments", REPORT: "Reports", PPT: "PPTs" };

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export default async function OverviewPage() {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const [
    userCount,
    paidCount,
    docCount,
    genCount,
    dsaCount,
    dsaSolvedCount,
    dau,
    wau,
    mau,
    planGroups,
    usageGroups,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { plan: { not: "FREE" } } }),
    prisma.document.count(),
    prisma.usageEvent.count(),
    prisma.dsaAttempt.count(),
    prisma.dsaAttempt.count({ where: { solved: true } }),
    prisma.user.count({ where: { lastSeenAt: { gte: daysAgo(1) } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: daysAgo(7) } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: daysAgo(30) } } }),
    prisma.user.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.usageEvent.groupBy({ by: ["kind"], _count: { _all: true }, where: { createdAt: { gte: daysAgo(28) } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true, plan: true, department: true, createdAt: true },
    }),
  ]);

  const cards = [
    { label: "Users", value: userCount },
    { label: "Paid users", value: paidCount },
    { label: "Documents", value: docCount },
    { label: "Generations (metered)", value: genCount },
    { label: "DSA attempts", value: dsaCount },
  ];

  const planByKey = Object.fromEntries(planGroups.map((g) => [g.plan, g._count._all]));
  const planTotal = Math.max(1, userCount);
  const usageByKind = Object.fromEntries(usageGroups.map((g) => [g.kind, g._count._all]));
  const usageMax = Math.max(1, ...Object.values(usageByKind));
  const dsaSolveRate = dsaCount === 0 ? 0 : Math.round((dsaSolvedCount / dsaCount) * 100);

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-[26px] font-bold text-ink">Overview</h1>
        <p className="mt-1 text-[15px] text-muted">
          Payments aren&apos;t wired to a gateway yet — plan changes here are manual overrides.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-card p-4">
            <p className="font-display text-[28px] font-bold text-ink">{c.value}</p>
            <p className="text-[14px] text-faint">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-faint">Active users</p>
          <dl className="space-y-2 text-[15px]">
            <div className="flex justify-between"><dt className="text-muted">DAU (24h)</dt><dd className="font-semibold text-ink">{dau}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">WAU (7d)</dt><dd className="font-semibold text-ink">{wau}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">MAU (30d)</dt><dd className="font-semibold text-ink">{mau}</dd></div>
          </dl>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-faint">Plan distribution</p>
          <div className="space-y-2">
            {(["FREE", "PRO", "PREMIUM"] as const).map((p) => {
              const count = planByKey[p] ?? 0;
              const pct = Math.round((count / planTotal) * 100);
              return (
                <div key={p}>
                  <div className="mb-0.5 flex justify-between text-[14px]"><span className="text-soft">{p}</span><span className="text-faint">{count} ({pct}%)</span></div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                    <div className={`h-full rounded-full ${PLAN_BAR[p]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-faint">DSA engagement</p>
          <dl className="space-y-2 text-[15px]">
            <div className="flex justify-between"><dt className="text-muted">Total attempts</dt><dd className="font-semibold text-ink">{dsaCount}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Solved</dt><dd className="font-semibold text-ink">{dsaSolvedCount}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Solve rate</dt><dd className="font-semibold text-ink">{dsaSolveRate}%</dd></div>
          </dl>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-line bg-card p-4">
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-faint">Usage by kind — last 28 days</p>
        <div className="space-y-2">
          {(["ASSIGNMENT", "REPORT", "PPT"] as const).map((k) => {
            const count = usageByKind[k] ?? 0;
            const pct = Math.round((count / usageMax) * 100);
            return (
              <div key={k}>
                <div className="mb-0.5 flex justify-between text-[14px]"><span className="text-soft">{KIND_LABEL[k]}</span><span className="text-faint">{count}</span></div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-cyan" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[17px] font-semibold text-ink">Recent signups</h2>
        <Link href="/users" className="text-[14.5px] font-medium text-cyan hover:underline">
          View all users →
        </Link>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-[14.5px]">
          <thead className="border-b border-line text-[13px] uppercase tracking-wide text-faint">
            <tr>
              {["User", "Dept", "Plan", "Joined"].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentUsers.map((u) => (
              <tr key={u.id} className="border-b border-line/60 last:border-0 hover:bg-surface">
                <td className="px-3 py-2.5">
                  <Link href={`/users/${u.id}`} className="font-medium text-ink hover:text-cyan">
                    {u.name ?? "—"}
                  </Link>
                  <p className="text-[13px] text-faint">{u.email}</p>
                </td>
                <td className="px-3 py-2.5 text-soft">{u.department ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[13px] font-semibold ${PLAN_STYLE[u.plan]}`}>
                    {u.plan}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-faint">{fmtDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
