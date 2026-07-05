"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { putObject, keys } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";
import { createBranchSolverDoc, runBranchSolverGeneration, addBranchSolverTurn } from "@/lib/branch-solver/generate";
import { hasBranchFeature } from "@/lib/capabilities";
import { branchSolverFeature } from "@/lib/branch-solver/features";
import { QuotaExceededError } from "@/lib/entitlements";
import { rateLimit, friendlyError } from "@/lib/reliability";

export type BranchSolverFormState = { error?: string; upgrade?: boolean };

const MAX_UPLOAD = 10 * 1024 * 1024; // 10 MB

export async function solveBranchAction(
  _prev: BranchSolverFormState,
  formData: FormData,
): Promise<BranchSolverFormState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  if (!user.onboardedAt) redirect("/onboarding");

  const feature = String(formData.get("feature") ?? "");
  // Server-side re-check — never trust that the client only shows this form to eligible branches.
  if (!feature || !branchSolverFeature(feature) || !hasBranchFeature(user.department, feature)) {
    return { error: "This tool isn't available for your branch." };
  }

  try { rateLimit(user.id, `branch-solver:${feature}`); } catch (e) { return { error: friendlyError(e) }; }

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

  const title = questionText ? questionText.slice(0, 60) : branchSolverFeature(feature)!.label;
  const input = { userId: user.id, feature, title, questionText, instructions, uploadKey, uploadMime };

  let docId: string;
  try {
    docId = await createBranchSolverDoc(input);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return {
        error: `You've used all ${err.limit} free branch-tool generations this month. Upgrade to Pro for unlimited.`,
        upgrade: true,
      };
    }
    return { error: friendlyError(err) };
  }

  after(() => runBranchSolverGeneration(docId, input));
  redirect(`/solve/${feature}/${docId}`);
}

/** Multi-turn loop: student asks a follow-up / gives feedback on the solution. */
export async function askBranchSolverAction(formData: FormData): Promise<void> {
  const user = await getOrCreateUser();
  const docId = String(formData.get("docId") ?? "");
  const feature = String(formData.get("feature") ?? "");
  if (!user || !docId) return;
  try {
    rateLimit(user.id, `branch-solver-tutor:${feature}`, 30);
    await addBranchSolverTurn(user.id, docId, String(formData.get("message") ?? ""));
  } catch {
    /* busy / rate-limited / surfaced on the page */
  }
  redirect(`/solve/${feature}/${docId}`);
}
