"use server";

import { revalidatePath } from "next/cache";
import { Plan, prisma } from "@studentos/db";
import { deleteObject } from "@studentos/storage";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/audit";
import { revokeClerkSession } from "@/lib/sessions";

function periodStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Manual grant of a real DB-driven PlanTier (see apps/admin/app/plans) — the authoritative
 * entitlement source (apps/web/lib/entitlements.ts). `planTierId: null` resets the user back to
 * the audience's default free tier. Also mirrors a coarse legacy `plan` label (still read by the
 * user list badge / apps/web settings) so it never falls out of sync with the real grant.
 * Ignored the moment the user has an ACTIVE paid Subscription — see getActivePlanTier's
 * precedence — so this never downgrades a real payer.
 */
export async function setUserPlanTier(userId: string, planTierId: string | null): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  let legacyPlan: Plan = Plan.FREE;
  if (planTierId) {
    const [tier, user] = await Promise.all([
      prisma.planTier.findUnique({ where: { id: planTierId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { userType: true } }),
    ]);
    if (!tier || !user || tier.audience !== user.userType || !tier.active) throw new Error("Invalid plan tier");
    legacyPlan = tier.isFree ? Plan.FREE : Plan.PRO;
  }

  const before = await prisma.user.findUnique({ where: { id: userId }, select: { planTierId: true, plan: true } });
  await prisma.user.update({ where: { id: userId }, data: { planTierId, plan: legacyPlan } });
  await logAdminAction({
    action: "user.plan_tier.set",
    targetType: "user",
    targetId: userId,
    before: { planTierId: before?.planTierId, plan: before?.plan },
    after: { planTierId, plan: legacyPlan },
  });

  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
  revalidatePath("/");
}

/** Suspend or reactivate an account. Enforced in apps/web's requireOnboardedUser. */
export async function setUserSuspended(userId: string, suspended: boolean): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  await prisma.user.update({
    where: { id: userId },
    data: { suspended, suspendedAt: suspended ? new Date() : null },
  });
  await logAdminAction({
    action: suspended ? "user.suspend" : "user.reactivate",
    targetType: "user",
    targetId: userId,
  });

  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
}

/** Force-logout one of a user's active devices (revoke Clerk session). */
export async function revokeUserSession(userId: string, sessionId: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  await revokeClerkSession(sessionId);
  await logAdminAction({
    action: "user.session.revoke",
    targetType: "user",
    targetId: userId,
    after: { sessionId },
  });

  revalidatePath(`/users/${userId}`);
}

/** Admin override for the branch-aware coding track (DSA + coding interview round). */
export async function setUserCodingEnabled(userId: string, codingEnabled: boolean): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  await prisma.user.update({ where: { id: userId }, data: { codingEnabled } });
  await logAdminAction({
    action: "user.coding.set",
    targetType: "user",
    targetId: userId,
    after: { codingEnabled },
  });

  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
}

/**
 * Clears this user's current-billing-period usage (ASSIGNMENT/REPORT/PPT UsageEvent rows), so
 * plan-gating counts them as under quota again. Support fix for "my free quota didn't reset."
 */
export async function resetUserQuota(userId: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  const { count } = await prisma.usageEvent.deleteMany({
    where: { userId, createdAt: { gte: periodStart() } },
  });
  await logAdminAction({
    action: "user.quota.reset",
    targetType: "user",
    targetId: userId,
    after: { deletedEvents: count },
  });

  revalidatePath(`/users/${userId}`);
}

/** Dumps a user's stored content for a GDPR-style data export request. */
export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      documents: { include: { content: true, exports: true } },
      dsaAttempts: true,
      uploads: true,
      assistantThread: true,
      deadlines: true,
      studyPlans: true,
      subscription: true,
    },
  });
  if (!user) throw new Error("User not found");

  await logAdminAction({ action: "user.data.export", targetType: "user", targetId: userId });

  return JSON.parse(JSON.stringify(user));
}

/**
 * Hard-deletes a user and everything they own (cascades via the schema's onDelete: Cascade on
 * Document, DsaAttempt, Upload, AssistantThread, Deadline, StudyPlan, Subscription, UsageEvent,
 * Workspace). Irreversible — the audit log entry is the only record left afterward.
 */
export async function deleteUserData(userId: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });

  // Collect R2 object keys before the cascade deletes the rows that reference them — the DB
  // cascade only clears Postgres rows, it never touches the actual blobs in storage.
  const [uploads, exports] = await Promise.all([
    prisma.upload.findMany({ where: { ownerId: userId }, select: { storageKey: true } }),
    prisma.documentExport.findMany({ where: { document: { ownerId: userId } }, select: { storageKey: true } }),
  ]);
  const storageKeys = [...uploads.map((u) => u.storageKey), ...exports.map((e) => e.storageKey)];

  await prisma.user.delete({ where: { id: userId } });

  const deleted = await Promise.allSettled(storageKeys.map((key) => deleteObject(key)));
  const storageFailures = deleted.filter((r) => r.status === "rejected").length;

  await logAdminAction({
    action: "user.data.delete",
    targetType: "user",
    targetId: userId,
    before: user ?? undefined,
    after: { storageKeysDeleted: storageKeys.length - storageFailures, storageFailures },
  });

  revalidatePath("/users");
}
