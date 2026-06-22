"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { putObject, keys } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";
import { createAssignmentDoc, runAssignmentGeneration, addAssignmentTurn } from "@/lib/assignments/generate";
import { QuotaExceededError } from "@/lib/entitlements";
import { rateLimit, friendlyError } from "@/lib/reliability";

export type AssignmentFormState = { error?: string; upgrade?: boolean };

const MAX_UPLOAD = 10 * 1024 * 1024; // 10 MB

export async function solveAssignmentAction(
  _prev: AssignmentFormState,
  formData: FormData,
): Promise<AssignmentFormState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  if (!user.onboardedAt) redirect("/onboarding");
  try { rateLimit(user.id, "assignment"); } catch (e) { return { error: friendlyError(e) }; }

  const questionText = String(formData.get("questionText") ?? "").trim() || undefined;
  const instructions = String(formData.get("instructions") ?? "").trim() || undefined;
  const file = formData.get("image");
  const hasFile = file instanceof File && file.size > 0;

  if (!questionText && !hasFile) {
    return { error: "Type the question or upload a photo/PDF of it." };
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

  const title = questionText ? questionText.slice(0, 60) : "Photo assignment";
  const input = { userId: user.id, title, questionText, instructions, uploadKey, uploadMime };

  // Create fast, solve in the BACKGROUND so the request returns immediately.
  let docId: string;
  try {
    docId = await createAssignmentDoc(input);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return {
        error: `You've used all ${err.limit} free assignments this month. Upgrade to Pro for unlimited.`,
        upgrade: true,
      };
    }
    return { error: friendlyError(err) };
  }

  after(() => runAssignmentGeneration(docId, input));
  redirect(`/assignments/${docId}`);
}

/** Multi-turn loop (#8.2): student asks a follow-up / gives feedback on the solution. */
export async function askAssignmentAction(formData: FormData): Promise<void> {
  const user = await getOrCreateUser();
  const docId = String(formData.get("docId") ?? "");
  const message = String(formData.get("message") ?? "");
  if (!user || !docId) return;
  try {
    rateLimit(user.id, "assignment-tutor", 30);
    await addAssignmentTurn(user.id, docId, message);
  } catch {
    /* busy / rate-limited / surfaced on the page */
  }
  redirect(`/assignments/${docId}`);
}
