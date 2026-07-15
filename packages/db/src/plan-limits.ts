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
