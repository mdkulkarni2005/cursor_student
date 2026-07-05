"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { putObject, keys } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";
import { createDrawingVivaDoc, runDrawingVivaGeneration, regenerateDrawingViva } from "@/lib/drawing-viva/generate";
import { hasBranchFeature } from "@/lib/capabilities";
import { QuotaExceededError } from "@/lib/entitlements";
import { rateLimit, friendlyError } from "@/lib/reliability";

export type DrawingVivaFormState = { error?: string; upgrade?: boolean };

const MAX_UPLOAD = 10 * 1024 * 1024; // 10 MB

export async function generateDrawingVivaAction(
  _prev: DrawingVivaFormState,
  formData: FormData,
): Promise<DrawingVivaFormState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  if (!user.onboardedAt) redirect("/onboarding");
  if (!hasBranchFeature(user.department, "drawing-viva")) {
    return { error: "This tool isn't available for your branch." };
  }
  try { rateLimit(user.id, "drawing-viva"); } catch (e) { return { error: friendlyError(e) }; }

  const instructions = String(formData.get("instructions") ?? "").trim() || undefined;
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Upload a photo of your drawing/sketch." };
  }
  if (file.size > MAX_UPLOAD) return { error: "File is too large (max 10 MB)." };
  if (!file.type.startsWith("image/")) return { error: "Upload an image file (photo of the drawing)." };

  const ext = (file.type.split("/")[1] || "jpg").replace("+xml", "");
  const uploadKey = keys.upload(user.id, crypto.randomUUID(), ext);
  await putObject(uploadKey, Buffer.from(await file.arrayBuffer()), file.type);

  const title = "Drawing viva prep";
  const input = { userId: user.id, title, instructions, uploadKey, uploadMime: file.type };

  let docId: string;
  try {
    docId = await createDrawingVivaDoc(input);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return {
        error: `You've used all ${err.limit} free branch-tool generations this month. Upgrade to Pro for unlimited.`,
        upgrade: true,
      };
    }
    return { error: friendlyError(err) };
  }

  after(() => runDrawingVivaGeneration(docId, input));
  redirect(`/drawing-viva/${docId}`);
}

export async function regenerateDrawingVivaAction(formData: FormData): Promise<void> {
  const user = await getOrCreateUser();
  const docId = String(formData.get("docId") ?? "");
  if (!user || !docId) return;
  try {
    rateLimit(user.id, "drawing-viva-regen", 10);
    await regenerateDrawingViva(user.id, docId);
  } catch {
    /* busy / rate-limited / surfaced on the page */
  }
  redirect(`/drawing-viva/${docId}`);
}
