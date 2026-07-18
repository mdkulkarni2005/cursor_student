"use server";

import { revalidatePath } from "next/cache";
import { requireOnboardedUser } from "@/lib/user";
import {
  getReportFigureSuggestions,
  approveReportFigure,
  removeReportFigure,
  cropReportFigure,
  resizeReportFigure,
} from "@/lib/reports/generate";
import { rateLimit, friendlyError } from "@/lib/reliability";
import { assertWithinCostBudget, CostBudgetExceededError } from "@/lib/entitlements";
import type { FigureSuggestion } from "@studentos/ai";

/** Propose figures for a report — a real (text) AI call, so it draws from the credit balance same
 *  as any other generation, even though no image is produced here. */
export async function suggestFiguresAction(docId: string): Promise<{ figures: FigureSuggestion[]; error?: string }> {
  const user = await requireOnboardedUser();
  try {
    await assertWithinCostBudget(user);
  } catch (e) {
    if (e instanceof CostBudgetExceededError) return { figures: [], error: e.message };
    throw e;
  }
  try {
    const figures = await getReportFigureSuggestions(user.id, docId);
    return { figures };
  } catch {
    return { figures: [], error: "Couldn't suggest figures right now." };
  }
}

/** Approve a figure → generate the image (credits spent here) → embed + re-render the report. */
export async function approveFigureAction(docId: string, sectionIndex: number, imagePrompt: string, caption: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireOnboardedUser();
  try {
    await rateLimit(user.id, "figure-approve", 10);
    await assertWithinCostBudget(user);
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
  const res = await approveReportFigure(user.id, docId, sectionIndex, imagePrompt, caption);
  if (res.ok) revalidatePath(`/reports/${docId}`);
  return res;
}

export async function removeFigureAction(docId: string, sectionIndex: number): Promise<{ ok: boolean }> {
  const user = await requireOnboardedUser();
  const res = await removeReportFigure(user.id, docId, sectionIndex);
  if (res.ok) revalidatePath(`/reports/${docId}`);
  return res;
}

/** Overwrite an approved figure's pixels with a client-cropped PNG (data URL) and re-render. */
export async function cropFigureAction(docId: string, sectionIndex: number, pngDataUrl: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireOnboardedUser();
  const res = await cropReportFigure(user.id, docId, sectionIndex, pngDataUrl);
  if (res.ok) revalidatePath(`/reports/${docId}`);
  return res;
}

/** Resize an approved figure (% of page width) and re-render. */
export async function resizeFigureAction(docId: string, sectionIndex: number, widthPct: number): Promise<{ ok: boolean; error?: string }> {
  const user = await requireOnboardedUser();
  const res = await resizeReportFigure(user.id, docId, sectionIndex, widthPct);
  if (res.ok) revalidatePath(`/reports/${docId}`);
  return res;
}
