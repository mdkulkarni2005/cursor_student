import { z } from "zod";
import { UsageKind, RecruiterUsageKind } from "@prisma/client";

// The shape stored in PlanTier.limits (Json). Validated on every admin write (apps/admin/app/plans)
// and every read (entitlements.ts) so the flexible JSON column stays safe — a malformed value can
// never reach the DB, and a malformed value already in the DB fails loudly instead of silently
// granting/denying the wrong thing.
const quotaValue = z.number().int().min(0).nullable();

export const planLimitsSchema = z.object({
  // Student-side generation quotas, per calendar month. Missing key = unlimited (same as null).
  usage: z.record(z.nativeEnum(UsageKind), quotaValue).default({}),
  // Binary feature gates, e.g. "priorityQueue" / "mentorReview" / "earlyAccess". Missing key = off.
  features: z.record(z.string(), z.boolean()).default({}),
  // Recruiter-side seat/contact quotas, per calendar month. Missing key = unlimited.
  recruiterUsage: z.record(z.nativeEnum(RecruiterUsageKind), quotaValue).default({}),
  // This tier's own $ AI-spend cap per calendar month (cents). Null/missing = fall back to the
  // admin global default (see entitlements.ts MAX_MONTHLY_AI_COST_CENTS) — without this every tier
  // shared one global cap regardless of price, so a paid tier got no more headroom than free.
  maxMonthlyAiCostCents: z.number().int().min(0).nullable().optional(),
});

export type PlanLimits = z.infer<typeof planLimitsSchema>;

/** Feature-toggle keys the admin UI offers a checkbox for — extend as new gated features ship. */
export const FEATURE_KEYS = ["priorityQueue", "mentorReview", "earlyAccess"] as const;

export function parsePlanLimits(value: unknown): PlanLimits {
  return planLimitsSchema.parse(value);
}

export function emptyPlanLimits(): PlanLimits {
  return { usage: {}, features: {}, recruiterUsage: {} };
}

// User-facing "credits" are just maxMonthlyAiCostCents (USD cents, tied to actual vendor billing)
// converted to a rupee-denominated number at the display/admin-input boundary, so the underlying
// cost ledger stays accurate to what the AI Gateway actually bills regardless of FX movement.
export const USD_TO_INR_RATE = 85;

export function usdCentsToCredits(usdCents: number): number {
  return Math.round((usdCents * USD_TO_INR_RATE) / 100);
}

export function creditsToUsdCents(credits: number): number {
  return Math.round((credits * 100) / USD_TO_INR_RATE);
}
