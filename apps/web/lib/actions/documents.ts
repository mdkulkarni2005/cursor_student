"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@studentos/db";
import { deleteObject } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";

/** Where to send the user after deleting each document type. */
const LIST_PATH: Record<string, string> = {
  REPORT: "/reports",
  PPT: "/ppt",
  RESUME: "/resume",
  ASSIGNMENT: "/assignments",
  PROJECT: "/projects",
  LAB_REPORT: "/lab-reports",
  DRAWING_VIVA: "/drawing-viva",
};

/**
 * Delete one of the user's documents (report / PPT / resume / assignment / project).
 * Ownership-checked. Child rows (content, exports, job) cascade in the DB; we also best-effort
 * delete the rendered files from storage so nothing is orphaned. Redirects to the list page.
 */
export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const user = await getOrCreateUser();
  const docId = String(formData.get("docId") ?? "");
  if (!user || !docId) return;

  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: user.id },
    select: { id: true, type: true, feature: true, exports: { select: { storageKey: true } } },
  });
  if (!doc) return;

  // Best-effort storage cleanup — never block the delete on it.
  await Promise.allSettled(doc.exports.map((e) => deleteObject(e.storageKey)));

  await prisma.document.delete({ where: { id: doc.id } });

  const dest =
    doc.type === "BRANCH_SOLVER" && doc.feature === "boq-estimator" ? "/boq-estimator"
    : doc.type === "BRANCH_SOLVER" && doc.feature ? `/solve/${doc.feature}`
    : (LIST_PATH[doc.type] ?? "/dashboard");
  revalidatePath(dest);
  revalidatePath("/dashboard");
  revalidatePath("/vault");
  redirect(dest);
}

/**
 * Delete one of the user's documents from the Vault and stay on the Vault.
 * Same ownership check + best-effort storage cleanup as {@link deleteDocumentAction},
 * but returns a result instead of redirecting so the Vault grid can update in place.
 */
export async function deleteVaultDocument(docId: string): Promise<{ ok: boolean }> {
  const user = await getOrCreateUser();
  if (!user || !docId) return { ok: false };

  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: user.id },
    select: { id: true, exports: { select: { storageKey: true } } },
  });
  if (!doc) return { ok: false };

  // Best-effort storage cleanup — never block the delete on it.
  await Promise.allSettled(doc.exports.map((e) => deleteObject(e.storageKey)));

  await prisma.document.delete({ where: { id: doc.id } });

  revalidatePath("/vault");
  revalidatePath("/dashboard");
  return { ok: true };
}
