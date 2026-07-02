import Link from "next/link";
import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { AdminShell } from "@/components/shell";

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

export default async function OverviewPage() {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const [userCount, paidCount, docCount, genCount, dsaCount, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { plan: { not: "FREE" } } }),
    prisma.document.count(),
    prisma.usageEvent.count(),
    prisma.dsaAttempt.count(),
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

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="font-display text-[24px] font-bold text-ink">Overview</h1>
        <p className="mt-1 text-[13px] text-muted">
          Payments aren&apos;t wired to a gateway yet — plan changes here are manual overrides.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-card p-4">
            <p className="font-display text-[26px] font-bold text-ink">{c.value}</p>
            <p className="text-[12px] text-faint">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[15px] font-semibold text-ink">Recent signups</h2>
        <Link href="/users" className="text-[12.5px] font-medium text-cyan hover:underline">
          View all users →
        </Link>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-[12.5px]">
          <thead className="border-b border-line text-[11px] uppercase tracking-wide text-faint">
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
                  <p className="text-[11px] text-faint">{u.email}</p>
                </td>
                <td className="px-3 py-2.5 text-soft">{u.department ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PLAN_STYLE[u.plan]}`}>
                    {u.plan}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-faint">{fmtDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
