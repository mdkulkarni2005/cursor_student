import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@studentos/db";

/**
 * Records a mutating admin action. Append-only — every write from apps/admin (plan overrides,
 * suspensions, deletes, template edits) must call this so there's an accountability trail.
 * Never throws: a logging failure must not block the underlying admin action.
 */
export async function logAdminAction(params: {
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  const user = await currentUser();
  const actorEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? "unknown";

  await prisma.adminAuditLog
    .create({
      data: {
        actorEmail,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        before: params.before === undefined ? undefined : (params.before as object),
        after: params.after === undefined ? undefined : (params.after as object),
      },
    })
    .catch((err) => {
      console.error("[admin audit] failed to log action", params.action, err);
    });
}
