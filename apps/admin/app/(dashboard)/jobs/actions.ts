"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/audit";

/**
 * Unsticks a job that's been stuck in QUEUED/GENERATING far past a normal generation time
 * (the app has no background worker to auto-recover these — see docs/BUILD_ORDER.md Phase B2).
 * Marks it FAILED with an admin note so the document's page shows the honest "try generating
 * again" state instead of spinning forever.
 */
export async function unstickJob(jobId: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");

  await prisma.$transaction([
    prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "FAILED", error: "Marked failed by admin (was stuck)", finishedAt: new Date() },
    }),
    prisma.document.update({ where: { id: job.documentId }, data: { status: "FAILED" } }),
  ]);

  await logAdminAction({
    action: "job.unstick",
    targetType: "generationJob",
    targetId: jobId,
    before: { status: job.status },
    after: { status: "FAILED" },
  });

  revalidatePath("/jobs");
}

/** Deletes a broken document (and its job/content/exports via cascade) so it stops cluttering the user's vault. */
export async function deleteFailedDocument(documentId: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  await prisma.document.delete({ where: { id: documentId } });
  await logAdminAction({ action: "document.delete", targetType: "document", targetId: documentId });

  revalidatePath("/jobs");
}
