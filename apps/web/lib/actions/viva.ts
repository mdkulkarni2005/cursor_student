"use server";

import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/user";
import { generateAndStoreViva } from "@/lib/viva/generate";

export async function generateVivaAction(formData: FormData): Promise<void> {
  const sourceId = String(formData.get("sourceId") ?? "");
  if (!sourceId) return;

  const user = await getOrCreateUser();
  if (!user) return;
  if (!user.onboardedAt) redirect("/onboarding");

  await generateAndStoreViva(user.id, sourceId);
  redirect(`/viva/${sourceId}`);
}
