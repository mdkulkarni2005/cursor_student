"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  Plan,
  prisma,
  UsageKind,
  RecruiterUsageKind,
  FEATURE_KEYS,
  planLimitsSchema,
  creditsToUsdCents,
  type PlanLimits,
  type PlanTier,
} from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/audit";

/**
 * Bulk-grants a newly created PlanTier to existing accounts in its audience — "apply to all
 * users now" at plan-creation time. An ACTIVE paid subscription always outranks a manual grant
 * (students: apps/web/lib/entitlements.ts's getActivePlanTier prioritizes Subscription over
 * User.planTierId; recruiters have no such fallback, so real payers are excluded explicitly here
 * to avoid clobbering their `RecruiterSubscription`). Returns how many accounts were touched.
 */
async function applyPlanTierToExistingUsers(tier: PlanTier): Promise<number> {
  if (tier.audience === "STUDENT" || tier.audience === "PROFESSIONAL") {
    const legacyPlan = tier.isFree ? Plan.FREE : Plan.PRO;
    const { count } = await prisma.user.updateMany({
      where: { userType: tier.audience },
      data: { planTierId: tier.id, plan: legacyPlan },
    });
    return count;
  }

  const recruiters = await prisma.recruiter.findMany({
    where: {
      OR: [{ subscription: null }, { subscription: { status: { not: "ACTIVE" } } }, { subscription: { razorpaySubId: null } }],
    },
    select: { id: true },
  });
  await prisma.$transaction(
    recruiters.map((r) =>
      prisma.recruiterSubscription.upsert({
        where: { recruiterId: r.id },
        create: { recruiterId: r.id, planTierId: tier.id, status: "ACTIVE" },
        update: { planTierId: tier.id, status: "ACTIVE" },
      }),
    ),
  );
  return recruiters.length;
}

/** Only one tier per audience may be the default free fallback (see getActivePlanTier /
 *  getActiveRecruiterPlanTier, which both pick the first `isFree: true` tier). Clears the flag
 *  off every other tier in the same audience whenever one is (re)marked free, so the two never
 *  disagree about which is default. */
async function clearOtherDefaultFreeTiers(audience: "STUDENT" | "PROFESSIONAL" | "RECRUITER", keepId: string): Promise<void> {
  await prisma.planTier.updateMany({
    where: { audience, isFree: true, id: { not: keepId } },
    data: { isFree: false },
  });
}

/** Only STUDENT tiers ever show usage fields, only RECRUITER ones show recruiterUsage fields (see
 *  plan-tier-form.tsx) — skip the other section entirely rather than reading absent form fields as
 *  explicit zeros, which `planLimitsSchema` would otherwise treat as "blocked", not "unlimited". */
function limitsFromFormData(formData: FormData, audience: "STUDENT" | "PROFESSIONAL" | "RECRUITER"): PlanLimits {
  const usage: Record<string, number | null> = {};
  if (audience === "STUDENT") {
    for (const kind of Object.values(UsageKind)) {
      const unlimited = formData.get(`usage_${kind}_unlimited`) === "on";
      usage[kind] = unlimited ? null : Math.max(0, Math.round(Number(formData.get(`usage_${kind}`)) || 0));
    }
  }

  const recruiterUsage: Record<string, number | null> = {};
  if (audience === "RECRUITER") {
    for (const kind of Object.values(RecruiterUsageKind)) {
      const unlimited = formData.get(`recruiterUsage_${kind}_unlimited`) === "on";
      recruiterUsage[kind] = unlimited ? null : Math.max(0, Math.round(Number(formData.get(`recruiterUsage_${kind}`)) || 0));
    }
  }

  const features: Record<string, boolean> = {};
  for (const key of FEATURE_KEYS) {
    features[key] = formData.get(`feature_${key}`) === "on";
  }

  const creditsUnlimited = formData.get("credits_unlimited") === "on";
  const maxMonthlyAiCostCents = creditsUnlimited
    ? null
    : creditsToUsdCents(Math.max(0, Math.round(Number(formData.get("credits")) || 0)));

  return planLimitsSchema.parse({ usage, features, recruiterUsage, maxMonthlyAiCostCents });
}

function fieldsFromFormData(formData: FormData) {
  const audienceRaw = formData.get("audience");
  if (audienceRaw !== "STUDENT" && audienceRaw !== "PROFESSIONAL" && audienceRaw !== "RECRUITER") throw new Error("Invalid audience");
  const audience: "STUDENT" | "PROFESSIONAL" | "RECRUITER" = audienceRaw;

  const slug = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!slug || !name) throw new Error("Slug and name are required");
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Slug must be lowercase letters, numbers, and hyphens only");

  const description = String(formData.get("description") ?? "").trim() || null;
  const priceCents = Math.max(0, Math.round(Number(formData.get("priceRupees")) * 100 || 0));
  const currency = String(formData.get("currency") ?? "INR").trim() || "INR";
  const billingPeriod = String(formData.get("billingPeriod") ?? "monthly").trim() || "monthly";
  const trialDays = Math.max(0, Math.round(Number(formData.get("trialDays")) || 0));
  const isFree = formData.get("isFree") === "on";
  const sortOrder = Math.round(Number(formData.get("sortOrder")) || 0);

  return { audience, slug, name, description, priceCents, currency, billingPeriod, trialDays, isFree, sortOrder };
}

export async function createPlanTier(formData: FormData): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  const fields = fieldsFromFormData(formData);
  const limits = limitsFromFormData(formData, fields.audience);

  // Always create inactive — a new tier's price/limits should be reviewed on the Plans list
  // before it's shown to users; use setPlanTierActive to go live once confirmed.
  const tier = await prisma.planTier.create({ data: { ...fields, limits, active: false } });
  if (fields.isFree) await clearOtherDefaultFreeTiers(fields.audience, tier.id);

  await logAdminAction({
    action: "plan_tier.create",
    targetType: "PlanTier",
    targetId: tier.id,
    after: { ...fields, limits },
  });

  if (formData.get("applyToAllUsers") === "on") {
    const affected = await applyPlanTierToExistingUsers(tier);
    await logAdminAction({
      action: "plan_tier.bulk_assign",
      targetType: "PlanTier",
      targetId: tier.id,
      after: { audience: tier.audience, affected },
    });
  }

  revalidatePath("/plans");
  revalidatePath("/users");
  redirect("/plans");
}

export async function updatePlanTier(id: string, formData: FormData): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  const before = await prisma.planTier.findUnique({ where: { id } });
  if (!before) throw new Error("Plan tier not found");

  const fields = fieldsFromFormData(formData);
  const limits = limitsFromFormData(formData, fields.audience);

  await prisma.planTier.update({ where: { id }, data: { ...fields, limits } });
  if (fields.isFree) await clearOtherDefaultFreeTiers(fields.audience, id);

  await logAdminAction({
    action: "plan_tier.update",
    targetType: "PlanTier",
    targetId: id,
    before: { ...before, limits: before.limits },
    after: { ...fields, limits },
  });

  revalidatePath("/plans");
  redirect("/plans");
}

export async function setPlanTierActive(id: string, active: boolean): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  await prisma.planTier.update({ where: { id }, data: { active } });
  await logAdminAction({
    action: active ? "plan_tier.activate" : "plan_tier.archive",
    targetType: "PlanTier",
    targetId: id,
    after: { active },
  });

  revalidatePath("/plans");
}

/** Explicit "make this the default free plan" action from the Plans list — sets `isFree` on this
 *  tier and clears it off every other tier in the same audience in one go. */
export async function setDefaultFreeTier(id: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  const tier = await prisma.planTier.findUnique({ where: { id } });
  if (!tier) throw new Error("Plan tier not found");
  if (!tier.active) throw new Error("Can't make an archived tier the default");

  await prisma.planTier.update({ where: { id }, data: { isFree: true } });
  await clearOtherDefaultFreeTiers(tier.audience, id);

  await logAdminAction({
    action: "plan_tier.set_default",
    targetType: "PlanTier",
    targetId: id,
    after: { audience: tier.audience, isFree: true },
  });

  revalidatePath("/plans");
}
