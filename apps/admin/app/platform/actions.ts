"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/audit";
import { setMaxConcurrentSessions } from "@/lib/sessions";
import { setMaxMonthlyAiCostCents } from "@/lib/platform-cost";

const GLOBAL_TRIAL_ENABLED_KEY = "GLOBAL_TRIAL_ENABLED";
const GLOBAL_TRIAL_DAYS_KEY = "GLOBAL_TRIAL_DAYS";
const GLOBAL_TRIAL_PLAN_TIER_ID_KEY = "GLOBAL_TRIAL_PLAN_TIER_ID";

export async function updateMaxConcurrentSessions(n: number): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");
  if (!Number.isFinite(n) || n < 1) throw new Error("Invalid limit");

  await setMaxConcurrentSessions(n);
  await logAdminAction({
    action: "platform.max_concurrent_sessions.set",
    targetType: "platform",
    targetId: "MAX_CONCURRENT_SESSIONS",
    after: { value: n },
  });

  revalidatePath("/platform");
}

export async function updateMaxMonthlyAiCostCents(cents: number): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");
  if (!Number.isFinite(cents) || cents < 0) throw new Error("Invalid amount");

  await setMaxMonthlyAiCostCents(cents);
  await logAdminAction({
    action: "platform.max_monthly_ai_cost_cents.set",
    targetType: "platform",
    targetId: "MAX_MONTHLY_AI_COST_CENTS",
    after: { value: cents },
  });

  revalidatePath("/platform");
}

/**
 * Admin-controlled global trial (the "everyone free for N months" promo) — start/end it and pick
 * which student PlanTier trial users get, all without a deploy. Read by
 * apps/web/lib/entitlements.ts's getGlobalTrialDays (new signups) and getActivePlanTier (existing
 * users still inside their trial window).
 */
export async function updateGlobalTrial(params: {
  enabled: boolean;
  days: number;
  planTierId: string | null;
}): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");
  if (!Number.isFinite(params.days) || params.days < 0) throw new Error("Invalid trial length");

  await prisma.$transaction([
    prisma.platformSetting.upsert({
      where: { key: GLOBAL_TRIAL_ENABLED_KEY },
      create: { key: GLOBAL_TRIAL_ENABLED_KEY, value: String(params.enabled) },
      update: { value: String(params.enabled) },
    }),
    prisma.platformSetting.upsert({
      where: { key: GLOBAL_TRIAL_DAYS_KEY },
      create: { key: GLOBAL_TRIAL_DAYS_KEY, value: String(Math.round(params.days)) },
      update: { value: String(Math.round(params.days)) },
    }),
    prisma.platformSetting.upsert({
      where: { key: GLOBAL_TRIAL_PLAN_TIER_ID_KEY },
      create: { key: GLOBAL_TRIAL_PLAN_TIER_ID_KEY, value: params.planTierId ?? "" },
      update: { value: params.planTierId ?? "" },
    }),
  ]);

  await logAdminAction({
    action: "platform.global_trial.set",
    targetType: "platform",
    targetId: "GLOBAL_TRIAL",
    after: params,
  });

  revalidatePath("/platform");
}
