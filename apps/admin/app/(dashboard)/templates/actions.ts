"use server";

import { revalidatePath } from "next/cache";
import { prisma, type TemplateType } from "@studentos/db";
import { putObject, deleteObject, keys } from "@studentos/storage";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/audit";

const TEMPLATE_TYPES = new Set(["REPORT", "PPT", "RESUME"]);

export async function createTemplate(formData: FormData): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  const type = String(formData.get("type") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const institutionId = String(formData.get("institutionId") ?? "") || null;
  const isDefault = formData.get("isDefault") === "on";
  const file = formData.get("file") as File | null;

  if (!TEMPLATE_TYPES.has(type)) throw new Error("Invalid template type");
  if (!name) throw new Error("Name is required");
  if (!file || file.size === 0) throw new Error("A template file is required");

  const template = await prisma.template.create({
    data: { type: type as TemplateType, name, institutionId, isDefault, storageKey: "" },
  });

  const ext = file.name.split(".").pop() || (type === "PPT" ? "pptx" : "docx");
  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = keys.template(template.id, ext);
  await putObject(storageKey, buffer, file.type || undefined);

  await prisma.template.update({ where: { id: template.id }, data: { storageKey } });

  if (isDefault) {
    // Only one default per (type, institution) — clear any prior default in the same scope.
    await prisma.template.updateMany({
      where: { type: type as TemplateType, institutionId, id: { not: template.id } },
      data: { isDefault: false },
    });
  }

  await logAdminAction({
    action: "template.create",
    targetType: "template",
    targetId: template.id,
    after: { type, name, institutionId, isDefault, storageKey },
  });

  revalidatePath("/templates");
}

export async function setTemplateDefault(id: string, type: string, institutionId: string | null): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  await prisma.$transaction([
    prisma.template.updateMany({
      where: { type: type as TemplateType, institutionId },
      data: { isDefault: false },
    }),
    prisma.template.update({ where: { id }, data: { isDefault: true } }),
  ]);

  await logAdminAction({ action: "template.setDefault", targetType: "template", targetId: id });
  revalidatePath("/templates");
}

export async function deleteTemplate(id: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  // Document.templateId is optional, so Prisma's default onDelete is SetNull, not Restrict —
  // check usage ourselves so an in-use template can't be silently detached from its documents.
  const docCount = await prisma.document.count({ where: { templateId: id } });
  if (docCount > 0) throw new Error(`In use by ${docCount} document(s)`);

  const template = await prisma.template.findUnique({ where: { id }, select: { storageKey: true } });
  await prisma.template.delete({ where: { id } });
  if (template?.storageKey) await deleteObject(template.storageKey).catch(() => {});
  await logAdminAction({ action: "template.delete", targetType: "template", targetId: id });
  revalidatePath("/templates");
}
