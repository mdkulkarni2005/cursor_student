"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { putObject, keys } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";
import { createBoqDoc, runBoqGeneration, addBoqTurn } from "@/lib/boq-estimator/generate";
import { hasBranchFeature } from "@/lib/capabilities";
import { QuotaExceededError } from "@/lib/entitlements";
import { rateLimit, friendlyError } from "@/lib/reliability";

export type BoqFormState = { error?: string; upgrade?: boolean };

const MAX_UPLOAD = 10 * 1024 * 1024; // 10 MB

export async function generateBoqAction(
  _prev: BoqFormState,
  formData: FormData,
): Promise<BoqFormState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  if (!user.onboardedAt) redirect("/onboarding");
  if (!hasBranchFeature(user.department, "boq-estimator")) {
    return { error: "This tool isn't available for your branch." };
  }
  try { rateLimit(user.id, "boq-estimator"); } catch (e) { return { error: friendlyError(e) }; }

  const dimensionsText = String(formData.get("dimensionsText") ?? "").trim() || undefined;
  const instructions = String(formData.get("instructions") ?? "").trim() || undefined;
  const file = formData.get("image");
  const hasFile = file instanceof File && file.size > 0;

  if (!dimensionsText && !hasFile) {
    return { error: "Type the dimensions/scope or upload a photo of the drawing." };
  }

  let uploadKey: string | undefined;
  let uploadMime: string | undefined;
  if (hasFile) {
    if (file.size > MAX_UPLOAD) return { error: "File is too large (max 10 MB)." };
    const ext = (file.type.split("/")[1] || "bin").replace("+xml", "");
    uploadKey = keys.upload(user.id, crypto.randomUUID(), ext);
    uploadMime = file.type;
    await putObject(uploadKey, Buffer.from(await file.arrayBuffer()), file.type);
  }

  const title = dimensionsText ? dimensionsText.slice(0, 60) : "BOQ Estimate";
  const input = { userId: user.id, title, dimensionsText, instructions, uploadKey, uploadMime };

  let docId: string;
  try {
    docId = await createBoqDoc(input);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return {
        error: `You've used all ${err.limit} free branch-tool generations this month. Upgrade to Pro for unlimited.`,
        upgrade: true,
      };
    }
    return { error: friendlyError(err) };
  }

  after(() => runBoqGeneration(docId, input));
  redirect(`/boq-estimator/${docId}`);
}

export async function askBoqAction(formData: FormData): Promise<void> {
  const user = await getOrCreateUser();
  const docId = String(formData.get("docId") ?? "");
  if (!user || !docId) return;
  try {
    rateLimit(user.id, "boq-estimator-tutor", 30);
    await addBoqTurn(user.id, docId, String(formData.get("message") ?? ""));
  } catch {
    /* busy / rate-limited / surfaced on the page */
  }
  redirect(`/boq-estimator/${docId}`);
}
