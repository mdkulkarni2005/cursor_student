import { prisma, parsePlanLimits, emptyPlanLimits, usdCentsToCredits } from "@studentos/db";
import type { UsageKind, User, PlanLimits } from "@studentos/db";

/**
 * Plan-gating (PLAN.md §8). The ONE server-side chokepoint that decides whether a
 * generation is allowed. Never trust the client — every generation calls assertWithinQuota
 * before it starts, and recordUsage after it succeeds.
 *
 * Limits are DB-driven (see apps/admin/app/plans) — `PlanTier.limits`, admin-editable without a
 * deploy. `null` (or a key missing entirely) = unlimited.
 */

const GLOBAL_TRIAL_ENABLED_KEY = "GLOBAL_TRIAL_ENABLED";
const GLOBAL_TRIAL_PLAN_TIER_ID_KEY = "GLOBAL_TRIAL_PLAN_TIER_ID";
const GLOBAL_TRIAL_DAYS_KEY = "GLOBAL_TRIAL_DAYS";

/** Admin-controlled promo trial (see apps/admin/app/platform's "Trial & Promo" card) — days a
 *  brand-new signup gets the trial PlanTier for, or null if the trial is currently switched off.
 *  Called once at account creation (see getOrCreateUser); does not affect existing users. */
export async function getGlobalTrialDays(): Promise<number | null> {
  const [enabledRow, daysRow] = await Promise.all([
    prisma.platformSetting.findUnique({ where: { key: GLOBAL_TRIAL_ENABLED_KEY } }),
    prisma.platformSetting.findUnique({ where: { key: GLOBAL_TRIAL_DAYS_KEY } }),
  ]);
  if (enabledRow?.value !== "true") return null;
  const days = Number(daysRow?.value);
  return Number.isFinite(days) && days > 0 ? days : null;
}

export type ResolvedPlanTier = { id: string; limits: PlanLimits };

/** Used only if apps/admin hasn't created any PlanTier rows yet — matches the historical
 *  "everything unlimited" behavior so a fresh deploy never breaks generation. */
const FALLBACK_TIER: ResolvedPlanTier = { id: "fallback-unlimited", limits: emptyPlanLimits() };

/** User.userType ("STUDENT" | "PROFESSIONAL") is exactly the PlanAudience each account draws its
 *  default free tier from — professionals must never fall back to the student free tier. */
async function defaultFreeTier(audience: "STUDENT" | "PROFESSIONAL"): Promise<ResolvedPlanTier | null> {
  const tier = await prisma.planTier.findFirst({
    where: { audience, active: true, isFree: true },
    orderBy: { sortOrder: "asc" },
  });
  return tier ? { id: tier.id, limits: parsePlanLimits(tier.limits) } : null;
}

/**
 * Resolves the PlanTier that governs this user right now: their active Subscription's tier, else
 * a manually admin-assigned tier on the User row, else the global admin-controlled trial tier
 * (while User.trialEndsAt hasn't passed), else the audience's default free tier.
 */
export async function getActivePlanTier(user: User): Promise<ResolvedPlanTier> {
  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { planTierId: true, status: true },
  });
  const tierId = (sub?.status === "ACTIVE" ? sub.planTierId : null) ?? user.planTierId ?? null;
  if (tierId) {
    const tier = await prisma.planTier.findUnique({ where: { id: tierId } });
    if (tier && tier.active) return { id: tier.id, limits: parsePlanLimits(tier.limits) };
  }

  if (user.trialEndsAt && user.trialEndsAt.getTime() > Date.now()) {
    const [enabledRow, trialTierRow] = await Promise.all([
      prisma.platformSetting.findUnique({ where: { key: GLOBAL_TRIAL_ENABLED_KEY } }),
      prisma.platformSetting.findUnique({ where: { key: GLOBAL_TRIAL_PLAN_TIER_ID_KEY } }),
    ]);
    if (enabledRow?.value === "true" && trialTierRow?.value) {
      const trialTier = await prisma.planTier.findUnique({ where: { id: trialTierRow.value } });
      if (trialTier && trialTier.active) return { id: trialTier.id, limits: parsePlanLimits(trialTier.limits) };
    }
  }

  return (await defaultFreeTier(user.userType)) ?? FALLBACK_TIER;
}

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

const COST_CAP_SETTING_KEY = "MAX_MONTHLY_AI_COST_CENTS";
/** Safety-net default while feature quotas above are unlimited — real $ backstop against a single
 *  account looping paid AI calls. Admin-adjustable (see /platform in apps/admin) without a deploy. */
const DEFAULT_MAX_MONTHLY_AI_COST_CENTS = 300; // $3.00/user/month

export class CostBudgetExceededError extends Error {
  constructor(public readonly capCents: number) {
    super(
      `You've reached this month's AI usage limit ($${(capCents / 100).toFixed(2)}). It resets on the 1st — reach out if you need more.`,
    );
    this.name = "CostBudgetExceededError";
  }
}

export async function getMaxMonthlyAiCostCents(): Promise<number> {
  const row = await prisma.platformSetting.findUnique({ where: { key: COST_CAP_SETTING_KEY } });
  const n = row ? Number(row.value) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MAX_MONTHLY_AI_COST_CENTS;
}

/** Tier-specific cap (PlanTier.limits.maxMonthlyAiCostCents) wins when set; otherwise falls back to
 *  the admin global default above. This is what makes a Pro tier actually get more $ headroom than
 *  Free — without it every tier shared one global cap regardless of price. */
async function effectiveCostCapCents(tier: ResolvedPlanTier): Promise<number> {
  return tier.limits.maxMonthlyAiCostCents ?? (await getMaxMonthlyAiCostCents());
}

export async function setMaxMonthlyAiCostCents(cents: number): Promise<void> {
  const value = String(Math.max(0, Math.round(cents)));
  await prisma.platformSetting.upsert({
    where: { key: COST_CAP_SETTING_KEY },
    create: { key: COST_CAP_SETTING_KEY, value },
    update: { value },
  });
}

/** Sum of this user's tracked AI spend (GenerationJob.costCents) so far this calendar month. */
export async function aiCostCentsThisPeriod(userId: string): Promise<number> {
  const agg = await prisma.generationJob.aggregate({
    _sum: { costCents: true },
    where: { document: { ownerId: userId }, createdAt: { gte: periodStart() } },
  });
  return agg._sum.costCents ?? 0;
}

/**
 * Hard $ backstop, independent of the per-feature quotas below. Throws `CostBudgetExceededError`
 * once this user's tracked AI spend this month is at/over their PLAN TIER's cap (falling back to
 * the admin global default if the tier doesn't set one) — so no single account can run up an
 * unbounded Gateway bill, and paid tiers get real headroom over free. Call at the ENTRY of every
 * AI-cost action — even ones whose own feature quota is unlimited.
 */
export async function assertWithinCostBudget(user: User): Promise<void> {
  const tier = await getActivePlanTier(user);
  const [cap, used] = await Promise.all([effectiveCostCapCents(tier), aiCostCentsThisPeriod(user.id)]);
  if (used >= cap) throw new CostBudgetExceededError(cap);
}

export function quotaFor(tier: ResolvedPlanTier, kind: UsageKind): number | null {
  return tier.limits.usage[kind] ?? null;
}

/** Binary feature gate (e.g. "priorityQueue", "mentorReview") — see packages/db plan-limits.ts. */
export function hasFeature(tier: ResolvedPlanTier, key: string): boolean {
  return tier.limits.features[key] ?? false;
}

export function usageThisPeriod(userId: string, kind: UsageKind): Promise<number> {
  return prisma.usageEvent.count({
    where: { userId, kind, createdAt: { gte: periodStart() } },
  });
}

/** Throws QuotaExceededError if the user has no remaining quota for `kind`, or
 *  CostBudgetExceededError if they've hit the $ backstop regardless of feature quota. */
export async function assertWithinQuota(user: User, kind: UsageKind): Promise<void> {
  await assertWithinCostBudget(user);
  const tier = await getActivePlanTier(user);
  const limit = quotaFor(tier, kind);
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
  const tier = await getActivePlanTier(user);
  const limit = quotaFor(tier, kind);
  const used = await usageThisPeriod(user.id, kind);
  return { used, limit, remaining: limit === null ? null : Math.max(0, limit - used) };
}

/**
 * The user-facing "credits" balance — the same number `assertWithinCostBudget` enforces, just
 * converted from USD cents to the ₹-denominated credit figure shown on plan cards and the usage
 * page. Every generation AND every edit/regeneration/follow-up draws from this same balance (see
 * assertWithinCostBudget call sites across lib/*\/generate.ts) — there's no separate "editing is
 * free" pool.
 */
export type CreditStatus = { limit: number | null; used: number; remaining: number | null };

export async function creditStatus(user: User): Promise<CreditStatus> {
  const tier = await getActivePlanTier(user);
  const [capCents, usedCents] = await Promise.all([effectiveCostCapCents(tier), aiCostCentsThisPeriod(user.id)]);
  const limit = tier.limits.maxMonthlyAiCostCents === null ? null : usdCentsToCredits(capCents);
  const used = usdCentsToCredits(usedCents);
  return { limit, used, remaining: limit === null ? null : Math.max(0, limit - used) };
}
