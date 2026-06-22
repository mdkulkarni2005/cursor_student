import { prisma, type User } from "@studentos/db";
import { putObject, keys } from "@studentos/storage";
import { renderResumeDocx, type Resume, type ResumeContact, type ResumeDensity } from "@studentos/documents";
import { generateResume, withAiRetry } from "@studentos/ai";
import { getOrCreateCurrentWorkspace } from "@/lib/workspace";
import { analyzeAts, type AtsReport } from "@/lib/resume/ats";
import { setJobStage } from "@/lib/jobs";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Stored on document.quality — the resume's render + scoring state. */
export type ResumeMeta = {
  density: ResumeDensity;
  targetRole?: string;
  jobDescription?: string;
  ats?: AtsReport;
};

export type GenerateResumeInput = {
  userId: string;
  /** Contact fields from the form; name/email fall back to the profile. */
  contact: Partial<ResumeContact>;
  targetRole?: string;
  rawNotes?: string;
  guidelines?: string;
};

/** Build the verified contact block from the profile + form (model never invents this). */
function contactFrom(user: User, form: Partial<ResumeContact>): ResumeContact {
  return {
    name: form.name?.trim() || user.name || "Your Name",
    email: form.email?.trim() || user.email || undefined,
    phone: form.phone?.trim() || undefined,
    location: form.location?.trim() || undefined,
    linkedin: form.linkedin?.trim() || undefined,
    github: form.github?.trim() || undefined,
    portfolio: form.portfolio?.trim() || undefined,
  };
}

/** Render the resume DOCX, recompute the ATS score, and (create or replace) export + content. */
async function persistRender(
  docId: string,
  resume: Resume,
  meta: Omit<ResumeMeta, "ats">,
  model: string | null,
): Promise<void> {
  const { buffer } = await renderResumeDocx(resume, meta.density);
  const exportKey = keys.exportFile(docId, "DOCX");
  await putObject(exportKey, buffer, DOCX_MIME);
  const ats = analyzeAts(resume, { targetRole: meta.targetRole, jobDescription: meta.jobDescription });
  const quality: ResumeMeta = { ...meta, ats };
  await prisma.$transaction([
    prisma.documentContent.upsert({
      where: { documentId: docId },
      create: { documentId: docId, data: resume as unknown as object },
      update: { data: resume as unknown as object },
    }),
    // Replace any prior DOCX export for this resume (re-render on edit / one-page).
    prisma.documentExport.deleteMany({ where: { documentId: docId, format: "DOCX" } }),
    prisma.documentExport.create({
      data: { documentId: docId, format: "DOCX", storageKey: exportKey, sizeBytes: buffer.length },
    }),
    prisma.document.update({
      where: { id: docId },
      data: { status: "READY", quality: quality as unknown as object },
    }),
    prisma.generationJob.update({
      where: { documentId: docId },
      data: { status: "SUCCEEDED", finishedAt: new Date(), ...(model ? { model } : {}) },
    }),
  ]);
}

/** Read the stored render/scoring meta off the document. */
function metaOf(quality: unknown): ResumeMeta {
  const q = (quality ?? {}) as Partial<ResumeMeta>;
  return { density: q.density ?? "normal", targetRole: q.targetRole, jobDescription: q.jobDescription, ats: q.ats };
}

/** Ordered, user-facing resume generation stages — shown live on the resume page. */
export const RESUME_STAGES = [
  { key: "draft", label: "Writing your resume" },
  { key: "format", label: "Formatting & scoring" },
] as const;

/** FAST: create the resume doc (GENERATING) so the action can redirect immediately. */
export async function createResumeDoc(input: GenerateResumeInput): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new Error("User not found.");
  const workspace = await getOrCreateCurrentWorkspace(user);
  const doc = await prisma.document.create({
    data: {
      ownerId: user.id,
      type: "RESUME",
      title: input.targetRole ? `Resume — ${input.targetRole}` : "Resume",
      status: "GENERATING",
      workspaceId: workspace.id,
      job: { create: { status: "RUNNING", startedAt: new Date(), pending: { stage: "draft" } as object } },
    },
  });
  return doc.id;
}

/** SLOW: generate the resume — runs in the background (Next `after`), never blocks the user. */
export async function runResumeGeneration(docId: string, input: GenerateResumeInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return;
  try {
    await setJobStage(docId, "draft");
    const { resume, model } = await withAiRetry(() => generateResume({
      contact: contactFrom(user, input.contact),
      targetRole: input.targetRole,
      department: user.department ?? undefined,
      rawNotes: input.rawNotes,
      guidelines: input.guidelines,
    }), { label: "resume.generate" });
    await setJobStage(docId, "format");
    await persistRender(docId, resume, { density: "normal", targetRole: input.targetRole }, model);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.document.update({ where: { id: docId }, data: { status: "FAILED" } }).catch(() => {});
    await prisma.generationJob
      .update({ where: { documentId: docId }, data: { status: "FAILED", error: message, finishedAt: new Date() } })
      .catch(() => {});
  }
}

/** Synchronous create+run (kept for non-interactive callers / scripts). */
export async function generateAndStoreResume(input: GenerateResumeInput): Promise<{ docId: string }> {
  const docId = await createResumeDoc(input);
  await runResumeGeneration(docId, input);
  return { docId };
}

/** Import an already-parsed resume (from a user's uploaded .docx/.pdf) → render in the house format. */
export async function importResume(userId: string, resume: Resume): Promise<{ docId: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");
  const workspace = await getOrCreateCurrentWorkspace(user);

  const doc = await prisma.document.create({
    data: {
      ownerId: user.id,
      type: "RESUME",
      title: `${resume.contact.name} — Resume`,
      status: "GENERATING",
      workspaceId: workspace.id,
      job: { create: { status: "RUNNING", startedAt: new Date() } },
    },
  });
  try {
    await persistRender(doc.id, resume, { density: "normal" }, "import");
    return { docId: doc.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.document.update({ where: { id: doc.id }, data: { status: "FAILED" } }).catch(() => {});
    await prisma.generationJob
      .update({ where: { documentId: doc.id }, data: { status: "FAILED", error: message, finishedAt: new Date() } })
      .catch(() => {});
    throw err;
  }
}

/** Load the stored resume data + render/scoring meta (the editable source of truth). */
export async function getResume(userId: string, docId: string): Promise<{ resume: Resume; meta: ResumeMeta } | null> {
  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: userId, type: "RESUME" },
    include: { content: true },
  });
  if (!doc?.content) return null;
  return { resume: doc.content.data as unknown as Resume, meta: metaOf(doc.quality) };
}

/** Edit-a-line: replace the structured data and re-render (format can't break — renderer owns it). */
export async function updateResume(userId: string, docId: string, resume: Resume): Promise<void> {
  const doc = await prisma.document.findFirst({ where: { id: docId, ownerId: userId, type: "RESUME" } });
  if (!doc) throw new Error("Resume not found.");
  const meta = metaOf(doc.quality);
  await persistRender(docId, resume, { density: meta.density, targetRole: meta.targetRole, jobDescription: meta.jobDescription }, null);
}

/** One-page button: re-render the same content with the tighter spacing preset. */
export async function setResumeDensity(userId: string, docId: string, density: ResumeDensity): Promise<void> {
  const current = await getResume(userId, docId);
  if (!current) throw new Error("Resume not found.");
  await persistRender(docId, current.resume, { density, targetRole: current.meta.targetRole, jobDescription: current.meta.jobDescription }, null);
}

/** Re-score against a (new) target role / pasted job description — recomputes ATS, no re-render needed. */
export async function rescoreResume(
  userId: string,
  docId: string,
  opts: { targetRole?: string; jobDescription?: string },
): Promise<void> {
  const current = await getResume(userId, docId);
  if (!current) throw new Error("Resume not found.");
  const targetRole = opts.targetRole?.trim() || current.meta.targetRole;
  const jobDescription = opts.jobDescription?.trim() || current.meta.jobDescription;
  const ats = analyzeAts(current.resume, { targetRole, jobDescription });
  const quality: ResumeMeta = { density: current.meta.density, targetRole, jobDescription, ats };
  await prisma.document.update({ where: { id: docId }, data: { quality: quality as unknown as object } });
}
