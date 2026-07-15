import Link from "next/link";
import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { AdminShell } from "@/components/shell";
import { PlanTierActiveToggle } from "./plan-tier-active-toggle";

export const metadata = { title: "Plans — Admin" };

function money(cents: number, currency: string): string {
  const symbol = currency === "INR" ? "₹" : currency + " ";
  return `${symbol}${(cents / 100).toLocaleString("en-IN")}`;
}

async function PlanTable({ audience }: { audience: "STUDENT" | "RECRUITER" }) {
  const tiers = await prisma.planTier.findMany({
    where: { audience },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { subscriptions: true, recruiterSubscriptions: true } },
    },
  });

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="w-full text-left text-[12.5px]">
        <thead className="border-b border-line text-[11px] uppercase tracking-wide text-faint">
          <tr>
            {["Name", "Slug", "Price", "Period", "Trial", "Free tier", "Subscribers", "Status", "Actions"].map((h) => (
              <th key={h} className="px-3 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tiers.map((t) => (
            <tr key={t.id} className="border-b border-line/60 last:border-0 hover:bg-surface">
              <td className="px-3 py-2.5 font-medium text-ink">{t.name}</td>
              <td className="px-3 py-2.5 text-faint">{t.slug}</td>
              <td className="px-3 py-2.5 text-soft">{money(t.priceCents, t.currency)}</td>
              <td className="px-3 py-2.5 text-soft">{t.billingPeriod}</td>
              <td className="px-3 py-2.5 text-soft">{t.trialDays > 0 ? `${t.trialDays}d` : "—"}</td>
              <td className="px-3 py-2.5">{t.isFree ? <span className="text-success">✓</span> : <span className="text-faint">—</span>}</td>
              <td className="px-3 py-2.5 text-soft">{t._count.subscriptions + t._count.recruiterSubscriptions}</td>
              <td className="px-3 py-2.5">
                {t.active ? (
                  <span className="text-success">Active</span>
                ) : (
                  <span className="text-faint">Archived</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Link href={`/plans/${t.id}`} className="rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-semibold text-soft hover:bg-surface">
                    Edit
                  </Link>
                  <PlanTierActiveToggle id={t.id} active={t.active} />
                </div>
              </td>
            </tr>
          ))}
          {tiers.length === 0 && (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center text-faint">
                No {audience.toLowerCase()} tiers yet — everything defaults to unlimited until you create one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function PlansPage() {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  return (
    <AdminShell>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[24px] font-bold text-ink">Plans</h1>
          <p className="mt-1 text-[13px] text-muted">
            Admin-controlled pricing tiers and usage limits for students and recruiters — no deploy needed to change a
            number. Marking a tier &quot;Free tier&quot; makes it the fallback for anyone without an active subscription.
          </p>
        </div>
        <Link href="/plans/new" className="rounded-lg bg-cyan px-3.5 py-2 text-[12.5px] font-semibold text-on-accent hover:opacity-90">
          New tier
        </Link>
      </div>

      <div className="mb-8">
        <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-muted">Student plans</h2>
        <PlanTable audience="STUDENT" />
      </div>

      <div>
        <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-muted">Recruiter plans</h2>
        <PlanTable audience="RECRUITER" />
      </div>
    </AdminShell>
  );
}
