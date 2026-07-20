import { NextResponse } from "next/server";
import { prisma, arePaymentsEnabled, usdCentsToCredits, type PlanLimits, type UsageKind } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";
import { getActivePlanTier, quotaStatus, creditStatus } from "@/lib/entitlements";

const USAGE_LABEL: Record<UsageKind, string> = {
  ASSIGNMENT: "Assignments",
  REPORT: "Reports",
  PPT: "PPTs",
  LAB_REPORT: "Lab reports",
  BRANCH_SOLVER: "Branch-solver tools",
  INTERVIEW: "Mock interviews",
  DSA: "DSA submissions",
  SYSTEM_DESIGN: "System design reviews",
};
// Document-generation kinds are student-only tools; professionals only ever get interview + DSA.
const STUDENT_KINDS: UsageKind[] = ["ASSIGNMENT", "REPORT", "LAB_REPORT", "PPT", "BRANCH_SOLVER", "INTERVIEW", "DSA", "SYSTEM_DESIGN"];
const PROFESSIONAL_KINDS: UsageKind[] = ["INTERVIEW", "DSA"];

/** Plan tiers available to this user's audience (STUDENT/PROFESSIONAL), their current tier, this
 *  period's per-feature usage against it, and whether checkout is live. */
export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const [tiers, currentTier, paymentsEnabled, credits] = await Promise.all([
    prisma.planTier.findMany({ where: { audience: user.userType, active: true }, orderBy: { sortOrder: "asc" } }),
    getActivePlanTier(user),
    arePaymentsEnabled(),
    creditStatus(user),
  ]);

  const kinds = user.userType === "PROFESSIONAL" ? PROFESSIONAL_KINDS : STUDENT_KINDS;
  const statuses = await Promise.all(kinds.map((kind) => quotaStatus(user, kind)));
  const usage = kinds.map((kind, i) => ({ kind, label: USAGE_LABEL[kind], ...statuses[i] }));

  return NextResponse.json({
    tiers: tiers.map((t) => {
      const limits = t.limits as PlanLimits;
      return {
        id: t.id,
        slug: t.slug,
        name: t.name,
        description: t.description,
        priceCents: t.priceCents,
        currency: t.currency,
        billingPeriod: t.billingPeriod,
        isFree: t.isFree,
        limits,
        credits: limits.maxMonthlyAiCostCents == null ? null : usdCentsToCredits(limits.maxMonthlyAiCostCents),
      };
    }),
    currentTierId: currentTier.id,
    paymentsEnabled,
    usage,
    credits,
  });
}
