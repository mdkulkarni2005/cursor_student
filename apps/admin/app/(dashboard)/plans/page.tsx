import Link from "next/link";
import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { PlanTierActiveToggle } from "./plan-tier-active-toggle";
import { PlanTierDefaultToggle } from "./plan-tier-default-toggle";

export const metadata = { title: "Plans — Admin" };

function money(cents: number, currency: string): string {
  const symbol = currency === "INR" ? "₹" : currency + " ";
  return `${symbol}${(cents / 100).toLocaleString("en-IN")}`;
}

/**
 * Resolves the same tier each account is actually governed by (mirrors
 * apps/web/lib/entitlements.ts's getActivePlanTier / apps/recruiter's recruiter equivalent, minus
 * the trial-window branch — good enough for a headcount, not a billing decision) so the "how many
 * users are on Free vs Pro" breakdown is accurate, including everyone silently on the default.
 */
async function resolvedTierCounts(
  audience: "STUDENT" | "PROFESSIONAL" | "RECRUITER",
): Promise<{ byTierId: Record<string, number>; unassigned: number }> {
  const byTierId: Record<string, number> = {};
  let unassigned = 0;

  if (audience === "STUDENT" || audience === "PROFESSIONAL") {
    const users = await prisma.user.findMany({
      where: { userType: audience },
      select: { planTierId: true, subscription: { select: { status: true, planTierId: true } } },
    });
    for (const u of users) {
      const resolved = (u.subscription?.status === "ACTIVE" ? u.subscription.planTierId : null) ?? u.planTierId;
      if (resolved) byTierId[resolved] = (byTierId[resolved] ?? 0) + 1;
      else unassigned += 1;
    }
  } else {
    const recruiters = await prisma.recruiter.findMany({
      select: { subscription: { select: { status: true, planTierId: true } } },
    });
    for (const r of recruiters) {
      const resolved = r.subscription?.status === "ACTIVE" ? r.subscription.planTierId : null;
      if (resolved) byTierId[resolved] = (byTierId[resolved] ?? 0) + 1;
      else unassigned += 1;
    }
  }

  return { byTierId, unassigned };
}

async function PlanTable({ audience }: { audience: "STUDENT" | "PROFESSIONAL" | "RECRUITER" }) {
  const [tiers, counts] = await Promise.all([
    prisma.planTier.findMany({ where: { audience }, orderBy: { sortOrder: "asc" } }),
    resolvedTierCounts(audience),
  ]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="w-full text-left text-[14.5px]">
        <thead className="border-b border-line text-[13px] uppercase tracking-wide text-faint">
          <tr>
            {["Name", "Slug", "Price", "Period", "Trial", "Default free", "Users", "Status", "Actions"].map((h) => (
              <th key={h} className="px-3 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tiers.map((t) => {
            const userCount = (counts.byTierId[t.id] ?? 0) + (t.isFree ? counts.unassigned : 0);
            return (
              <tr key={t.id} className="border-b border-line/60 last:border-0 hover:bg-surface">
                <td className="px-3 py-2.5 font-medium text-ink">{t.name}</td>
                <td className="px-3 py-2.5 text-faint">{t.slug}</td>
                <td className="px-3 py-2.5 text-soft">{money(t.priceCents, t.currency)}</td>
                <td className="px-3 py-2.5 text-soft">{t.billingPeriod}</td>
                <td className="px-3 py-2.5 text-soft">{t.trialDays > 0 ? `${t.trialDays}d` : "—"}</td>
                <td className="px-3 py-2.5">
                  <PlanTierDefaultToggle id={t.id} isFree={t.isFree} />
                </td>
                <td className="px-3 py-2.5 font-semibold text-ink">{userCount}</td>
                <td className="px-3 py-2.5">
                  {t.active ? (
                    <span className="text-success">Active</span>
                  ) : (
                    <span className="text-faint">Archived</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Link href={`/plans/${t.id}`} className="rounded-lg border border-line px-2.5 py-1 text-[13.5px] font-semibold text-soft hover:bg-surface">
                      Edit
                    </Link>
                    <PlanTierActiveToggle id={t.id} active={t.active} />
                  </div>
                </td>
              </tr>
            );
          })}
          {tiers.length === 0 && (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center text-faint">
                No {audience.toLowerCase()} tiers yet — everything defaults to unlimited until you create one.
                {counts.unassigned > 0 && ` (${counts.unassigned} ${audience.toLowerCase()}s currently unlimited.)`}
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
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[26px] font-bold text-ink">Plans</h1>
          <p className="mt-1 text-[15px] text-muted">
            Admin-controlled pricing tiers and usage limits for students and recruiters — no deploy needed to change a
            number. Marking a tier &quot;Free tier&quot; makes it the fallback for anyone without an active subscription.
          </p>
        </div>
        <Link href="/plans/new" className="rounded-lg bg-cyan px-3.5 py-2 text-[14.5px] font-semibold text-on-accent hover:opacity-90">
          New tier
        </Link>
      </div>

      <div className="mb-8">
        <h2 className="mb-2 text-[15px] font-bold uppercase tracking-wide text-muted">Student plans</h2>
        <PlanTable audience="STUDENT" />
      </div>

      <div className="mb-8">
        <h2 className="mb-2 text-[15px] font-bold uppercase tracking-wide text-muted">Working professional plans</h2>
        <PlanTable audience="PROFESSIONAL" />
      </div>

      <div>
        <h2 className="mb-2 text-[15px] font-bold uppercase tracking-wide text-muted">Recruiter plans</h2>
        <PlanTable audience="RECRUITER" />
      </div>
    </>
  );
}
