"use server";

import { revalidatePath } from "next/cache";
import { getOrCreateUser } from "@/lib/user";
import { submitDiagnosis, type DiagnosisResult } from "@/lib/fault-finder/practice";
import { FAULT_FINDER_BY_SLUG } from "@/lib/fault-finder/catalog";
import { rateLimit, friendlyError } from "@/lib/reliability";

export type FaultFinderFormState = { error?: string; result?: DiagnosisResult };

export async function submitDiagnosisAction(
  _prev: FaultFinderFormState,
  formData: FormData,
): Promise<FaultFinderFormState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  try {
    await rateLimit(user.id, "fault-finder-submit", 30);
  } catch (e) {
    return { error: friendlyError(e) };
  }

  const slug = String(formData.get("slug") ?? "");
  if (!FAULT_FINDER_BY_SLUG[slug]) return { error: "Unknown scenario." };

  const guessComponentId = String(formData.get("componentId") ?? "");
  const guessFaultType = String(formData.get("faultType") ?? "");
  if (!guessComponentId) return { error: "Select which component you think is faulty." };
  if (guessFaultType !== "open" && guessFaultType !== "short") return { error: "Select a fault type." };

  try {
    const result = await submitDiagnosis(user.id, slug, guessComponentId, guessFaultType);
    revalidatePath(`/fault-finder/${slug}`);
    revalidatePath("/fault-finder");
    return { result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't submit. Try again." };
  }
}
