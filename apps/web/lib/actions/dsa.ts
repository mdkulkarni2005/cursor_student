"use server";

import { revalidatePath } from "next/cache";
import { getOrCreateUser } from "@/lib/user";
import { gradeAttempt, type AttemptReview } from "@/lib/dsa/practice";
import { DSA_BY_SLUG } from "@/lib/dsa/catalog";
import { rateLimit, friendlyError } from "@/lib/reliability";
import { assertWithinQuota, recordUsage } from "@/lib/entitlements";

export type AttemptFormState = { error?: string; review?: AttemptReview };

export async function submitAttemptAction(
  _prev: AttemptFormState,
  formData: FormData,
): Promise<AttemptFormState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  try {
    await rateLimit(user.id, "dsa-submit", 30);
    // gradeAttempt also calls the AI reviewer below — this was previously ungated against both
    // the per-tier $ cost cap and per-plan quota.
    await assertWithinQuota(user, "DSA");
  } catch (e) {
    return { error: friendlyError(e) };
  }

  const slug = String(formData.get("slug") ?? "");
  if (!DSA_BY_SLUG[slug]) return { error: "Unknown problem." };
  const code = String(formData.get("code") ?? "");
  if (code.length > 50_000) return { error: "That's a lot of code — trim it down." };
  const language = String(formData.get("language") ?? "") || "Python";

  try {
    const { review } = await gradeAttempt({ userId: user.id, slug, code, language });
    await recordUsage(user.id, "DSA");
    // Streak + solved badges live on these pages — refresh them.
    revalidatePath(`/dsa/${slug}`);
    revalidatePath("/dsa");
    revalidatePath("/");
    return { review };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't submit. Try again." };
  }
}
