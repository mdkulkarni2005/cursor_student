"use server";

import { revalidatePath } from "next/cache";
import { getOrCreateUser } from "@/lib/user";
import { gradeDesign, type SystemDesignCanvas } from "@/lib/system-design/practice";
import { SYSTEM_DESIGN_BY_SLUG } from "@/lib/system-design/catalog";
import { rateLimit, friendlyError } from "@/lib/reliability";
import { assertWithinQuota, recordUsage } from "@/lib/entitlements";
import type { SystemDesignReview } from "@studentos/ai";

export type SystemDesignFormState = { error?: string; review?: SystemDesignReview };

export async function submitDesignAction(
  _prev: SystemDesignFormState,
  formData: FormData,
): Promise<SystemDesignFormState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  try {
    await rateLimit(user.id, "system-design-submit", 30);
    await assertWithinQuota(user, "SYSTEM_DESIGN");
  } catch (e) {
    return { error: friendlyError(e) };
  }

  const slug = String(formData.get("slug") ?? "");
  if (!SYSTEM_DESIGN_BY_SLUG[slug]) return { error: "Unknown scenario." };

  const canvasRaw = String(formData.get("canvas") ?? "");
  let canvas: SystemDesignCanvas;
  try {
    canvas = JSON.parse(canvasRaw);
  } catch {
    return { error: "Couldn't read your canvas. Try again." };
  }

  try {
    const { review } = await gradeDesign({ userId: user.id, slug, canvas });
    await recordUsage(user.id, "SYSTEM_DESIGN");
    revalidatePath(`/system-design/${slug}`);
    revalidatePath("/system-design");
    revalidatePath("/");
    return { review };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't submit. Try again." };
  }
}
