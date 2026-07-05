"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { putObject, keys } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";
import { createLabReportDoc, runLabReportGeneration, addLabReportTurn } from "@/lib/lab-reports/generate";
import { QuotaExceededError } from "@/lib/entitlements";
import { rateLimit, friendlyError } from "@/lib/reliability";

export type LabReportFormState = { error?: string; upgrade?: boolean };

const MAX_UPLOAD = 10 * 1024 * 1024; // 10 MB

export async function generateLabReportAction(
  _prev: LabReportFormState,
  formData: FormData,
): Promise<LabReportFormState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  if (!user.onboardedAt) redirect("/onboarding");
  try { rateLimit(user.id, "lab-report"); } catch (e) { return { error: friendlyError(e) }; }

  const readingsText = String(formData.get("readingsText") ?? "").trim() || undefined;
  const instructions = String(formData.get("instructions") ?? "").trim() || undefined;
  const file = formData.get("image");
  const hasFile = file instanceof File && file.size > 0;

  if (!readingsText && !hasFile) {
    return { error: "Type your raw readings or upload a photo of your observation table/graph." };
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

  const title = readingsText ? readingsText.slice(0, 60) : "Lab report";
  const input = { userId: user.id, title, readingsText, instructions, uploadKey, uploadMime };

  let docId: string;
  try {
    docId = await createLabReportDoc(input);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return {
        error: `You've used all ${err.limit} free lab reports this month. Upgrade to Pro for unlimited.`,
        upgrade: true,
      };
    }
    return { error: friendlyError(err) };
  }

  after(() => runLabReportGeneration(docId, input));
  redirect(`/lab-reports/${docId}`);
}

/** Multi-turn loop: student asks a follow-up / gives feedback on the report. */
export async function askLabReportAction(formData: FormData): Promise<void> {
  const user = await getOrCreateUser();
  const docId = String(formData.get("docId") ?? "");
  const message = String(formData.get("message") ?? "");
  if (!user || !docId) return;
  try {
    rateLimit(user.id, "lab-report-tutor", 30);
    await addLabReportTurn(user.id, docId, message);
  } catch {
    /* busy / rate-limited / surfaced on the page */
  }
  redirect(`/lab-reports/${docId}`);
}
