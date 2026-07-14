"use server";

import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/user";
import { generateAndStoreViva } from "@/lib/viva/generate";
import { rateLimit } from "@/lib/reliability";

export async function generateVivaAction(formData: FormData): Promise<void> {
  const sourceId = String(formData.get("sourceId") ?? "");
  if (!sourceId) return;

  const user = await getOrCreateUser();
  if (!user) return;
  if (!user.onboardedAt) redirect("/onboarding");

  try {
    await rateLimit(user.id, "viva-generate", 10);
    await generateAndStoreViva(user.id, sourceId);
  } catch {
    /* rate-limited / generation failed — the page's "no viva generated yet" empty state covers it */
  }
  redirect(`/viva/${sourceId}`);
}
