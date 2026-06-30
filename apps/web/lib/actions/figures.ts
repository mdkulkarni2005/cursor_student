"use server";

import { revalidatePath } from "next/cache";
import { requireOnboardedUser } from "@/lib/user";
import {
  getReportFigureSuggestions,
  approveReportFigure,
  removeReportFigure,
} from "@/lib/reports/generate";
import type { FigureSuggestion } from "@studentos/ai";

/** Propose figures for a report (text only — no image generated, no credits spent). */
export async function suggestFiguresAction(docId: string): Promise<{ figures: FigureSuggestion[]; error?: string }> {
  const user = await requireOnboardedUser();
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
