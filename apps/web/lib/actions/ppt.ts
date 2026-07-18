"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@studentos/db";
import { type ClarifyQuestion, generateSlideImage, slideImagePrompt } from "@studentos/ai";
import { PptContentSchema, richToPlain, inspectPptxStructure, fillPptxTemplateInPlace } from "@studentos/documents";
import { putObject, getObjectBuffer, keys } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";
import { createPptDoc, runPptGeneration, resumePptGeneration, markPptGenerating, rerenderPptExport } from "@/lib/ppt/generate";
import { createConvertedReportDoc, runConvertedReport } from "@/lib/reports/generate";
import { addJobCostCents } from "@/lib/jobs";
import { QuotaExceededError, assertWithinCostBudget, CostBudgetExceededError } from "@/lib/entitlements";
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
  try { await rateLimit(user.id, "ppt"); } catch (e) { return { error: friendlyError(e) }; }
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
  // Create fast, then expand in the BACKGROUND so the request returns immediately (a 2-minute
  // synchronous action froze the UI and let the Clerk session go stale). The report page shows
  // the live generating poller while `runConvertedReport` works.
  let reportId: string;
  try {
    const res = await createConvertedReportDoc(user.id, pptDocId);
    reportId = res.docId;
  } catch (err) {
    if (err instanceof QuotaExceededError) redirect("/plans");
    redirect(`/ppt/${pptDocId}`);
  }
  after(() => runConvertedReport(reportId, user.id, pptDocId));
  redirect(`/reports/${reportId}`);
}

export type SaveDeckState = { ok?: boolean; error?: string };

/** Save edited deck content (in-app editor) and re-render the .pptx so the download matches.
 *  Disabled for templated decks — editing those in-app would abandon the uploaded template. */
export async function savePptDeckAction(docId: string, rawContent: unknown): Promise<SaveDeckState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  try { await rateLimit(user.id, "ppt"); } catch (e) { return { error: friendlyError(e) }; }

  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: user.id, type: "PPT" },
    include: { content: true },
  });
  if (!doc) return { error: "Presentation not found." };
  if ((doc.content?.data as { templated?: boolean } | undefined)?.templated) {
    return { error: "This deck follows your uploaded template — download it to edit in PowerPoint." };
  }

  const parsed = PptContentSchema.safeParse(rawContent);
  if (!parsed.success) return { error: "Some slides are incomplete — please fill them in before saving." };

  try {
    await rerenderPptExport(docId, parsed.data);
  } catch (e) {
    return { error: friendlyError(e) };
  }
  revalidatePath(`/ppt/${docId}`);
  return { ok: true };
}

export type TemplateDeckEdit = {
  /** Edited bullet lines per section, in the template's section order. */
  sections: string[][];
  /** Edited info-table values (field label → value). */
  fields: Record<string, string>;
};

/**
 * Save edits to a deck bound to an uploaded STRUCTURED template — the template-preserving path.
 * Re-fills the ORIGINAL .pptx (never a generic deck): loads the stored template, re-detects its
 * structure, writes the edited section bullets (mapped by section order) + info-table fields, and
 * only replaces the export if the fill succeeds. Requires a deck generated after template linking
 * was added (older decks have no `templateKey` and must be regenerated to edit in-app).
 */
export async function saveTemplateDeckAction(docId: string, edit: TemplateDeckEdit): Promise<SaveDeckState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  try { await rateLimit(user.id, "ppt"); } catch (e) { return { error: friendlyError(e) }; }

  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: user.id, type: "PPT" },
    include: { content: true },
  });
  if (!doc) return { error: "Presentation not found." };
  const data = (doc.content?.data ?? {}) as {
    templated?: boolean; templateKey?: string; fieldValues?: Record<string, string>; [k: string]: unknown;
  };
  if (!data.templated || !data.templateKey) {
    return { error: "This deck isn't linked to a template file — regenerate it once to enable in-app editing." };
  }

  let templateBuffer: Buffer;
  try {
    templateBuffer = await getObjectBuffer(data.templateKey);
  } catch {
    return { error: "We couldn't find your uploaded template file." };
  }

  const structure = inspectPptxStructure(templateBuffer);
  if (!structure.ok || !structure.structured) return { error: "This template can no longer be read." };

  // Map edited bullets to the template's section slides BY ORDER (headings stay the template's own).
  const sectionHeadings = structure.slides
    .filter((s): s is Extract<(typeof structure.slides)[number], { kind: "section" }> => s.kind === "section")
    .map((s) => s.heading);
  const contentByHeading: Record<string, string[]> = {};
  sectionHeadings.forEach((heading, i) => {
    const bullets = (edit.sections[i] ?? []).map((b) => b.trim()).filter(Boolean);
    contentByHeading[heading] = bullets.length ? bullets : ["(add content)"];
  });

  // Persisted field values are the baseline (so identity data never reverts to the template's XYZ);
  // the user's non-empty edits win.
  const fieldValues: Record<string, string> = { ...(data.fieldValues ?? {}) };
  for (const [label, value] of Object.entries(edit.fields)) {
    const v = String(value ?? "").trim();
    if (v) fieldValues[label] = v;
  }

  const filled = fillPptxTemplateInPlace(templateBuffer, structure, contentByHeading, fieldValues);
  if (!filled.ok || !filled.buffer) {
    return { error: "We couldn't apply your edits to the template — your saved deck is unchanged." };
  }

  const exportKey = keys.exportFile(docId, "PPTX");
  await putObject(exportKey, filled.buffer, PPTX_MIME);

  const newData = {
    ...data,
    slides: sectionHeadings.map((heading) => ({ layout: "bullets", heading, bullets: contentByHeading[heading] })),
    fieldValues,
  };
  await prisma.$transaction([
    prisma.documentContent.upsert({
      where: { documentId: docId },
      create: { documentId: docId, data: newData as object },
      update: { data: newData as object },
    }),
    prisma.documentExport.deleteMany({ where: { documentId: docId, format: "PPTX" } }),
    prisma.documentExport.create({
      data: { documentId: docId, format: "PPTX", storageKey: exportKey, sizeBytes: filled.buffer.length },
    }),
  ]);
  revalidatePath(`/ppt/${docId}`);
  return { ok: true };
}

/** Generate (or regenerate) an image for one slide, persist it, and re-render the export. */
export async function regenerateSlideImageAction(
  docId: string,
  slideIndex: number,
  rawContent: unknown,
): Promise<SaveDeckState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  try { await rateLimit(user.id, "ppt"); } catch (e) { return { error: friendlyError(e) }; }

  const doc = await prisma.document.findFirst({ where: { id: docId, ownerId: user.id, type: "PPT" } });
  if (!doc) return { error: "Presentation not found." };

  try {
    await assertWithinCostBudget(user);
  } catch (e) {
    if (e instanceof CostBudgetExceededError) return { error: e.message };
    throw e;
  }

  const parsed = PptContentSchema.safeParse(rawContent);
  if (!parsed.success) return { error: "Please save your edits before generating an image." };
  const slide = parsed.data.slides[slideIndex];
  if (!slide) return { error: "Slide not found." };

  const img = await generateSlideImage(slideImagePrompt(richToPlain(slide.heading) || parsed.data.title, parsed.data.title));
  if (!img) return { error: "Image generation isn't available right now (check the AI Gateway image model)." };
  await addJobCostCents(docId, img.costCents);

  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i.exec(img.dataUrl);
  if (!m) return { error: "Image generation returned an unexpected format." };
  const key = keys.slideImage(docId, slideIndex);
  await putObject(key, Buffer.from(m[2]!, "base64"), m[1]!);
  slide.image = key;

  try {
    await rerenderPptExport(docId, parsed.data);
  } catch (e) {
    return { error: friendlyError(e) };
  }
  revalidatePath(`/ppt/${docId}`);
  return { ok: true };
}

/** Resize a slide's image (0.5–1.5×) and re-render the export. */
export async function resizeSlideImageAction(
  docId: string,
  slideIndex: number,
  scale: number,
  rawContent: unknown,
): Promise<SaveDeckState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };

  const doc = await prisma.document.findFirst({ where: { id: docId, ownerId: user.id, type: "PPT" } });
  if (!doc) return { error: "Presentation not found." };

  const parsed = PptContentSchema.safeParse(rawContent);
  if (!parsed.success) return { error: "Please save your edits before resizing the image." };
  const slide = parsed.data.slides[slideIndex];
  if (!slide?.image) return { error: "This slide has no image to resize." };
  if (!Number.isFinite(scale)) return { error: "Invalid size." };

  slide.imageScale = Math.min(1.5, Math.max(0.5, scale));
  try {
    await rerenderPptExport(docId, parsed.data);
  } catch (e) {
    return { error: friendlyError(e) };
  }
  revalidatePath(`/ppt/${docId}`);
  return { ok: true };
}

/** Overwrite a slide's image with a client-cropped PNG (data URL) and re-render the export. */
export async function cropSlideImageAction(
  docId: string,
  slideIndex: number,
  pngDataUrl: string,
  rawContent: unknown,
): Promise<SaveDeckState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  try { await rateLimit(user.id, "ppt"); } catch (e) { return { error: friendlyError(e) }; }

  const doc = await prisma.document.findFirst({ where: { id: docId, ownerId: user.id, type: "PPT" } });
  if (!doc) return { error: "Presentation not found." };

  const parsed = PptContentSchema.safeParse(rawContent);
  if (!parsed.success) return { error: "Please save your edits before cropping the image." };
  const slide = parsed.data.slides[slideIndex];
  if (!slide?.image) return { error: "This slide has no image to crop." };

  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i.exec(pngDataUrl);
  if (!m) return { error: "Invalid image data." };
  await putObject(slide.image, Buffer.from(m[2]!, "base64"), m[1]!);

  try {
    await rerenderPptExport(docId, parsed.data);
  } catch (e) {
    return { error: friendlyError(e) };
  }
  revalidatePath(`/ppt/${docId}`);
  return { ok: true };
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

  await markPptGenerating(docId, user.id);
  after(() => resumePptGeneration(user.id, docId, answers));
  redirect(`/ppt/${docId}`);
}
