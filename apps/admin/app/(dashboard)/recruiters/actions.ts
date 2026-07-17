"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/audit";

/**
 * Approving grants recruiter access via TWO writes: the local `Recruiter.status` (source of
 * truth for apps/recruiter's own queries) AND Clerk `publicMetadata.role: "recruiter"` (the
 * second factor apps/recruiter's requireRecruiter() checks) — recruiters can never self-grant
 * this by editing their own onboarding form.
 */
export async function approveRecruiter(id: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  const recruiter = await prisma.recruiter.findUnique({ where: { id } });
  if (!recruiter) throw new Error("Recruiter not found");

  const client = await clerkClient();
  // Clerk's updateUser REPLACES publicMetadata wholesale — it doesn't merge. Spread the current
  // value first so this can't silently clobber an unrelated flag already on the same Clerk user
  // (e.g. someone who is also an admin).
  const clerkUser = await client.users.getUser(recruiter.clerkId);
  await client.users.updateUser(recruiter.clerkId, {
    publicMetadata: { ...clerkUser.publicMetadata, role: "recruiter" },
  });

  await prisma.recruiter.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date(), rejectionNote: null },
  });

  await logAdminAction({
    action: "recruiter.approve",
    targetType: "recruiter",
    targetId: id,
    before: { status: recruiter.status },
    after: { status: "APPROVED" },
  });

  revalidatePath("/recruiters");
}

export async function rejectRecruiter(id: string, note: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  const recruiter = await prisma.recruiter.findUnique({ where: { id } });
  if (!recruiter) throw new Error("Recruiter not found");

  await prisma.recruiter.update({
    where: { id },
    data: { status: "REJECTED", rejectionNote: note || null },
  });

  await logAdminAction({
    action: "recruiter.reject",
    targetType: "recruiter",
    targetId: id,
    before: { status: recruiter.status },
    after: { status: "REJECTED", rejectionNote: note || null },
  });

  revalidatePath("/recruiters");
}
