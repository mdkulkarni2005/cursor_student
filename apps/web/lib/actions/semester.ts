"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@studentos/db";
import { requireOnboardedUser } from "@/lib/user";
import { getOrCreateCurrentWorkspace } from "@/lib/semester";

export async function addSubject(formData: FormData): Promise<void> {
  const user = await requireOnboardedUser();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (name.length < 2) return;

  const workspace = await getOrCreateCurrentWorkspace(user);
  await prisma.subject.create({
    data: { workspaceId: workspace.id, name, code: code || null },
  });
  revalidatePath("/semester");
}

export async function addDeadline(formData: FormData): Promise<void> {
  const user = await requireOnboardedUser();
  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "other").trim();
  const dueRaw = String(formData.get("dueAt") ?? "").trim();
  const subjectId = String(formData.get("subjectId") ?? "").trim() || null;
  if (title.length < 2 || !dueRaw) return;
  const dueAt = new Date(dueRaw);
  if (Number.isNaN(dueAt.getTime())) return;

  await prisma.deadline.create({
    data: { userId: user.id, title, kind, dueAt, subjectId },
  });
  revalidatePath("/semester");
}
