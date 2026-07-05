import { prisma } from "@studentos/db";
import type { Plan, UsageKind, User } from "@studentos/db";

/**
 * Plan-gating (PLAN.md §8). The ONE server-side chokepoint that decides whether a
 * generation is allowed. Never trust the client — every generation calls assertWithinQuota
 * before it starts, and recordUsage after it succeeds.
 *
 * `null` = unlimited.
 */
const QUOTAS: Record<Plan, Record<UsageKind, number | null>> = {
  // Limits removed while we're in global testing — everything is unlimited for now.
  // Revisit and set real FREE-tier numbers once the app is finalized.
  FREE: { ASSIGNMENT: null, REPORT: null, PPT: null, LAB_REPORT: null, BRANCH_SOLVER: null },
  PRO: { ASSIGNMENT: null, REPORT: null, PPT: null, LAB_REPORT: null, BRANCH_SOLVER: null },
  PREMIUM: { ASSIGNMENT: null, REPORT: null, PPT: null, LAB_REPORT: null, BRANCH_SOLVER: null },
};

export class QuotaExceededError extends Error {
  constructor(
    public readonly kind: UsageKind,
    public readonly limit: number,
  ) {
    super(`Monthly ${kind.toLowerCase()} limit reached (${limit}).`);
    this.name = "QuotaExceededError";
  }
}

/** Quotas reset on the 1st of each calendar month (until tied to Subscription periods). */
function periodStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function quotaFor(plan: Plan, kind: UsageKind): number | null {
  return QUOTAS[plan][kind];
}

export function usageThisPeriod(userId: string, kind: UsageKind): Promise<number> {
  return prisma.usageEvent.count({
    where: { userId, kind, createdAt: { gte: periodStart() } },
  });
}

/** Throws QuotaExceededError if the user has no remaining quota for `kind`. */
export async function assertWithinQuota(user: User, kind: UsageKind): Promise<void> {
  const limit = quotaFor(user.plan, kind);
  if (limit === null) return; // unlimited
  const used = await usageThisPeriod(user.id, kind);
  if (used >= limit) throw new QuotaExceededError(kind, limit);
}

export async function recordUsage(
  userId: string,
  kind: UsageKind,
  documentId?: string,
): Promise<void> {
  await prisma.usageEvent.create({ data: { userId, kind, documentId } });
}

export type QuotaStatus = { used: number; limit: number | null; remaining: number | null };

export async function quotaStatus(user: User, kind: UsageKind): Promise<QuotaStatus> {
  const limit = quotaFor(user.plan, kind);
  const used = await usageThisPeriod(user.id, kind);
  return { used, limit, remaining: limit === null ? null : Math.max(0, limit - used) };
}
