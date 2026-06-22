"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@studentos/db";
import { type ClarifyQuestion } from "@studentos/ai";
import { putObject, keys } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";
import { createPptDoc, runPptGeneration, resumePptGeneration, markPptGenerating } from "@/lib/ppt/generate";
import { convertPptToReport } from "@/lib/reports/generate";
import { QuotaExceededError } from "@/lib/entitlements";
import { rateLimit, friendlyError } from "@/lib/reliability";

const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export type PptFormState = {
  error?: string;
  upgrade?: boolean;
  /** When set, the UI shows these clarifying questions instead of generating. */
  questions?: ClarifyQuestion[];
  /** Carries an uploaded template key across the clarify round-trip. */
  templateKey?: string;
};

export async function generatePptAction(
  _prev: PptFormState,
  formData: FormData,
): Promise<PptFormState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  try { rateLimit(user.id, "ppt"); } catch (e) { return { error: friendlyError(e) }; }
  if (!user.onboardedAt) redirect("/onboarding");

  const title = String(formData.get("title") ?? "").trim();
  const guidelines = String(formData.get("guidelines") ?? "").trim() || undefined;
  const slideCount = Math.min(15, Math.max(4, parseInt(String(formData.get("slideCount") ?? "8"), 10) || 8));

  if (title.length < 4) return { error: "Please enter a clearer topic (at least 4 characters)." };

  // Optional: the user's own .pptx template.
  let templateKey = String(formData.get("templateKey") ?? "") || undefined;
  if (!templateKey) {
    const file = formData.get("template");
    if (file instanceof File && file.size > 0) {
      if (!file.name.toLowerCase().endsWith(".pptx")) {
        return { error: "Please upload a PowerPoint .pptx template." };
      }
      if (file.size > 20 * 1024 * 1024) return { error: "Template is too large (max 20 MB)." };
      templateKey = keys.upload(user.id, crypto.randomUUID(), "pptx");
      await putObject(templateKey, Buffer.from(await file.arrayBuffer()), PPTX_MIME);
    }
  }

  const input = { userId: user.id, title, slideCount, guidelines, templateKey };

  // Create fast, generate in the BACKGROUND (no multi-minute blocking request).
  let docId: string;
  try {
    docId = await createPptDoc(input);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return {
        error: `You've used all ${err.limit} free PPTs this month. Upgrade to Pro for unlimited.`,
        upgrade: true,
      };
    }
    return { error: friendlyError(err) };
  }

  after(() => runPptGeneration(docId, input));
  redirect(`/ppt/${docId}`);
}

/**
 * Report → PPT: turn an existing report into a slide deck. Reuses the normal PPT pipeline
 * (background generation, slide images, finalize) by feeding the report's text as context, so
 * the deck gets the same formatting + visuals as any other deck — just grounded in the report.
 */
export async function convertReportToPptAction(formData: FormData): Promise<void> {
  const user = await getOrCreateUser();
  const reportId = String(formData.get("reportId") ?? "");
  if (!user || !reportId) redirect("/ppt");

  const report = await prisma.document.findFirst({
    where: { id: reportId, ownerId: user.id, type: "REPORT" },
    include: { content: true },
  });
  if (!report?.content) redirect("/ppt");

  const data = report.content.data as { abstract?: string; sections?: { heading: string; content: string }[] };
  const sections = data.sections ?? [];
  const body = [
    data.abstract ? `Abstract: ${data.abstract}` : "",
    ...sections.map((s) => `## ${s.heading}\n${s.content}`),
  ]
    .filter(Boolean)
    .join("\n\n");
  if (!body.trim()) redirect(`/reports/${reportId}`);

  const guidelines = [
    "Build these slides FROM the existing report below. Condense each major section into slides with crisp bullets and short speaker notes.",
    "Use ONLY the report's content — do not invent new facts, names, numbers, or sections. Skip cover-page / certificate / acknowledgement / reference material.",
    "",
    "REPORT CONTENT:",
    body,
  ]
    .join("\n")
    .slice(0, 8000);
  const slideCount = Math.min(15, Math.max(6, sections.length + 2));
  const input = { userId: user.id, title: report.title, slideCount, guidelines };

  let docId: string;
  try {
    docId = await createPptDoc(input);
  } catch (err) {
    if (err instanceof QuotaExceededError) redirect("/plans");
    redirect(`/reports/${reportId}`);
  }
  after(() => runPptGeneration(docId, input));
  redirect(`/ppt/${docId}`);
}

/** Convert this deck into a written report (PPT → Report). */
export async function convertPptToReportAction(formData: FormData): Promise<void> {
  const user = await getOrCreateUser();
  const pptDocId = String(formData.get("docId") ?? "");
  if (!user || !pptDocId) return;
  let reportId: string;
  try {
    const res = await convertPptToReport(user.id, pptDocId);
    reportId = res.docId;
  } catch {
    redirect(`/ppt/${pptDocId}`);
  }
  redirect(`/reports/${reportId}`);
}

/** Resume a deck paused at NEEDS_INPUT, with the user's answers to the mid-generation questions. */
export async function resumePptAction(formData: FormData): Promise<void> {
  const docId = String(formData.get("docId") ?? "");
  const user = await getOrCreateUser();
  if (!user || !docId) return;

  const answers: Record<string, string> = {};
  const rawQs = formData.get("clarifyQuestions");
  if (typeof rawQs === "string" && rawQs) {
    try {
      const qs = JSON.parse(rawQs) as ClarifyQuestion[];
      for (const q of qs) {
        const vals = formData.getAll(`clarify_${q.id}`).map(String).map((s) => s.trim()).filter(Boolean);
        if (vals.length) answers[q.id] = vals.join(", ");
      }
    } catch {
      /* ignore */
    }
  }

  await markPptGenerating(docId);
  after(() => resumePptGeneration(user.id, docId, answers));
  redirect(`/ppt/${docId}`);
}
