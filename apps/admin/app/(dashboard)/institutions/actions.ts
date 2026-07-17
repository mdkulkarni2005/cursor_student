"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/audit";

export async function createInstitution(formData: FormData): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  const name = String(formData.get("name") ?? "").trim();
  const university = String(formData.get("university") ?? "").trim() || undefined;
  if (!name) throw new Error("Name is required");

  const institution = await prisma.institution.create({ data: { name, university } });
  await logAdminAction({
    action: "institution.create",
    targetType: "institution",
    targetId: institution.id,
    after: { name, university },
  });

  revalidatePath("/institutions");
}

export async function updateInstitution(id: string, formData: FormData): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  const name = String(formData.get("name") ?? "").trim();
  const university = String(formData.get("university") ?? "").trim() || null;
  if (!name) throw new Error("Name is required");

  const before = await prisma.institution.findUnique({ where: { id } });
  await prisma.institution.update({ where: { id }, data: { name, university } });
  await logAdminAction({
    action: "institution.update",
    targetType: "institution",
    targetId: id,
    before: { name: before?.name, university: before?.university },
    after: { name, university },
  });

  revalidatePath("/institutions");
}

export async function deleteInstitution(id: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  // Both relations are optional (institutionId String?), so Prisma's default onDelete is
  // SetNull, not Restrict — a plain delete() would silently detach users/templates instead of
  // erroring. Check usage ourselves so "in use" actually blocks the delete.
  const [userCount, templateCount] = await Promise.all([
    prisma.user.count({ where: { institutionId: id } }),
    prisma.template.count({ where: { institutionId: id } }),
  ]);
  if (userCount + templateCount > 0) {
    throw new Error(`In use by ${userCount} user(s) and ${templateCount} template(s)`);
  }

  await prisma.institution.delete({ where: { id } });
  await logAdminAction({ action: "institution.delete", targetType: "institution", targetId: id });

  revalidatePath("/institutions");
}
