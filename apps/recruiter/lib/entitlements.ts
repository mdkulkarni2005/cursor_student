import "server-only";
import { prisma, parsePlanLimits, emptyPlanLimits } from "@studentos/db";
import type { Recruiter, RecruiterUsageKind, PlanLimits } from "@studentos/db";

/**
 * Recruiter-side mirror of apps/web/lib/entitlements.ts — the ONE server-side chokepoint for
 * whether a job posting / candidate contact is allowed. Recruiters previously had no billing at
 * all; every recruiter without a RecruiterSubscription falls back to the audience's default free
 * tier (or, if apps/admin hasn't created one yet, unlimited — same "never break on a fresh
 * deploy" fallback as the student side).
 */

export type ResolvedPlanTier = { id: string; limits: PlanLimits };

const FALLBACK_TIER: ResolvedPlanTier = { id: "fallback-unlimited", limits: emptyPlanLimits() };

async function defaultFreeRecruiterTier(): Promise<ResolvedPlanTier | null> {
  const tier = await prisma.planTier.findFirst({
    where: { audience: "RECRUITER", active: true, isFree: true },
    orderBy: { sortOrder: "asc" },
  });
  return tier ? { id: tier.id, limits: parsePlanLimits(tier.limits) } : null;
}

export async function getActiveRecruiterPlanTier(recruiterId: string): Promise<ResolvedPlanTier> {
  const sub = await prisma.recruiterSubscription.findUnique({
    where: { recruiterId },
    select: { planTierId: true, status: true, trialEndsAt: true },
  });
  const tierId = sub?.status === "ACTIVE" ? sub.planTierId : null;
  if (tierId) {
    const tier = await prisma.planTier.findUnique({ where: { id: tierId } });
    if (tier && tier.active) return { id: tier.id, limits: parsePlanLimits(tier.limits) };
  }
  return (await defaultFreeRecruiterTier()) ?? FALLBACK_TIER;
}

export function recruiterQuotaFor(tier: ResolvedPlanTier, kind: RecruiterUsageKind): number | null {
  return tier.limits.recruiterUsage[kind] ?? null;
}

export function recruiterHasFeature(tier: ResolvedPlanTier, key: string): boolean {
  return tier.limits.features[key] ?? false;
}

export class RecruiterQuotaExceededError extends Error {
  constructor(
    public readonly kind: RecruiterUsageKind,
    public readonly limit: number,
  ) {
    super(`Monthly ${kind.toLowerCase().replace("_", " ")} limit reached (${limit}).`);
    this.name = "RecruiterQuotaExceededError";
  }
}

/** Quotas reset on the 1st of each calendar month, same convention as the student side. */
function periodStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function recruiterUsageThisPeriod(recruiterId: string, kind: RecruiterUsageKind): Promise<number> {
  return prisma.recruiterUsageEvent.count({
    where: { recruiterId, kind, createdAt: { gte: periodStart() } },
  });
}

export async function assertRecruiterWithinQuota(recruiter: Recruiter, kind: RecruiterUsageKind): Promise<void> {
  const tier = await getActiveRecruiterPlanTier(recruiter.id);
  const limit = recruiterQuotaFor(tier, kind);
  if (limit === null) return; // unlimited
  const used = await recruiterUsageThisPeriod(recruiter.id, kind);
  if (used >= limit) throw new RecruiterQuotaExceededError(kind, limit);
}

export async function recordRecruiterUsage(recruiterId: string, kind: RecruiterUsageKind): Promise<void> {
  await prisma.recruiterUsageEvent.create({ data: { recruiterId, kind } });
}
