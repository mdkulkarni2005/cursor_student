"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, UsageKind, RecruiterUsageKind, FEATURE_KEYS, planLimitsSchema, type PlanLimits } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/audit";

function limitsFromFormData(formData: FormData): PlanLimits {
  const usage: Record<string, number | null> = {};
  for (const kind of Object.values(UsageKind)) {
    const unlimited = formData.get(`usage_${kind}_unlimited`) === "on";
    usage[kind] = unlimited ? null : Math.max(0, Math.round(Number(formData.get(`usage_${kind}`)) || 0));
  }

  const recruiterUsage: Record<string, number | null> = {};
  for (const kind of Object.values(RecruiterUsageKind)) {
    const unlimited = formData.get(`recruiterUsage_${kind}_unlimited`) === "on";
    recruiterUsage[kind] = unlimited ? null : Math.max(0, Math.round(Number(formData.get(`recruiterUsage_${kind}`)) || 0));
  }

  const features: Record<string, boolean> = {};
  for (const key of FEATURE_KEYS) {
    features[key] = formData.get(`feature_${key}`) === "on";
  }

  return planLimitsSchema.parse({ usage, features, recruiterUsage });
}

function fieldsFromFormData(formData: FormData) {
  const audienceRaw = formData.get("audience");
  if (audienceRaw !== "STUDENT" && audienceRaw !== "RECRUITER") throw new Error("Invalid audience");
  const audience: "STUDENT" | "RECRUITER" = audienceRaw;

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
  const limits = limitsFromFormData(formData);

  const tier = await prisma.planTier.create({ data: { ...fields, limits } });

  await logAdminAction({
    action: "plan_tier.create",
    targetType: "PlanTier",
    targetId: tier.id,
    after: { ...fields, limits },
  });

  revalidatePath("/plans");
  redirect("/plans");
}

export async function updatePlanTier(id: string, formData: FormData): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  const before = await prisma.planTier.findUnique({ where: { id } });
  if (!before) throw new Error("Plan tier not found");

  const fields = fieldsFromFormData(formData);
  const limits = limitsFromFormData(formData);

  await prisma.planTier.update({ where: { id }, data: { ...fields, limits } });

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
