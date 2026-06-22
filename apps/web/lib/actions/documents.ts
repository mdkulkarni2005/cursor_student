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
    select: { id: true, type: true, exports: { select: { storageKey: true } } },
  });
  if (!doc) return;

  // Best-effort storage cleanup — never block the delete on it.
  await Promise.allSettled(doc.exports.map((e) => deleteObject(e.storageKey)));

  await prisma.document.delete({ where: { id: doc.id } });

  const dest = LIST_PATH[doc.type] ?? "/dashboard";
  revalidatePath(dest);
  revalidatePath("/dashboard");
  revalidatePath("/vault");
  redirect(dest);
}
