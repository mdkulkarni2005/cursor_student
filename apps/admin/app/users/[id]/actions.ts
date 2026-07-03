"use server";

import { revalidatePath } from "next/cache";
import { Plan, prisma } from "@studentos/db";
import { deleteObject } from "@studentos/storage";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/audit";

const PLAN_VALUES = new Set(Object.values(Plan));

function periodStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Manual plan override. There's no payment gateway wired up yet, so this is how a paid
 * upgrade/downgrade actually takes effect until Razorpay billing lands — admin sets the
 * plan by hand after confirming payment out-of-band.
 */
export async function setUserPlan(userId: string, plan: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");
  if (!PLAN_VALUES.has(plan as Plan)) throw new Error("Invalid plan");

  const before = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  await prisma.user.update({ where: { id: userId }, data: { plan: plan as Plan } });
  await logAdminAction({
    action: "user.plan.set",
    targetType: "user",
    targetId: userId,
    before: { plan: before?.plan },
    after: { plan },
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
