"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { assessContext, answersToContext, withAiRetry, type ClarifyQuestion } from "@studentos/ai";
import { ResumeSchema, parseResumeDocx, parseResumeText, type Resume } from "@studentos/documents";
import { getOrCreateUser } from "@/lib/user";
import { createResumeDoc, runResumeGeneration, setResumeDensity, rescoreResume, updateResume, importResume } from "@/lib/resume/generate";
import { rateLimit, friendlyError } from "@/lib/reliability";

export type ResumeFormState = {
  error?: string;
  /** When set, the UI shows these clarifying questions instead of generating. */
  questions?: ClarifyQuestion[];
};

export async function generateResumeAction(
  _prev: ResumeFormState,
  formData: FormData,
): Promise<ResumeFormState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  if (!user.onboardedAt) redirect("/onboarding");
  try { rateLimit(user.id, "resume"); } catch (e) { return { error: friendlyError(e) }; }

  const targetRole = String(formData.get("targetRole") ?? "").trim() || undefined;
  let rawNotes = String(formData.get("rawNotes") ?? "").trim() || undefined;
  const contact = {
    name: String(formData.get("name") ?? "").trim() || undefined,
    email: String(formData.get("email") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    location: String(formData.get("location") ?? "").trim() || undefined,
    linkedin: String(formData.get("linkedin") ?? "").trim() || undefined,
    github: String(formData.get("github") ?? "").trim() || undefined,
    portfolio: String(formData.get("portfolio") ?? "").trim() || undefined,
  };

  const alreadyAsked = formData.get("clarifyShown") === "1";
  if (!alreadyAsked) {
    // Clarifying-questions loop: thin notes → ask instead of guessing. Non-fatal.
    try {
      const assessment = await withAiRetry(() => assessContext({
        task: "resume",
        topic: targetRole ?? "resume",
        context: rawNotes,
        department: user.department ?? undefined,
      }), { label: "resume.assess" });
      if (!assessment.ready && assessment.questions.length > 0) {
        return { questions: assessment.questions };
      }
    } catch {
      /* clarify is optional — proceed to generation */
    }
  } else {
    const rawQs = formData.get("clarifyQuestions");
    if (typeof rawQs === "string" && rawQs) {
      try {
        const qs = JSON.parse(rawQs) as ClarifyQuestion[];
        const answers: Record<string, string> = {};
        for (const q of qs) {
          const vals = formData.getAll(`clarify_${q.id}`).map(String).map((s) => s.trim()).filter(Boolean);
          if (vals.length) answers[q.id] = vals.join(", ");
        }
        const extra = answersToContext(qs, answers);
        if (extra) rawNotes = [rawNotes, extra].filter(Boolean).join("\n");
      } catch {
        /* ignore malformed answers */
      }
    }
  }

  const input = { userId: user.id, contact, targetRole, rawNotes };
  let docId: string;
  try {
    docId = await createResumeDoc(input);
  } catch (err) {
    return { error: friendlyError(err) };
  }

  // Background the slow generation; the resume page shows live progress.
  after(() => runResumeGeneration(docId, input));
  redirect(`/resume/${docId}`);
}

/** One-page button: re-render the same content with the tighter spacing preset (or back to normal). */
export async function toggleResumeDensityAction(formData: FormData): Promise<void> {
  const docId = String(formData.get("docId") ?? "");
  const density = formData.get("density") === "tight" ? "tight" : "normal";
  const user = await getOrCreateUser();
  if (!user || !docId) return;
  await setResumeDensity(user.id, docId, density);
  redirect(`/resume/${docId}`);
}

const DOCX_EXT = ".docx";
const PDF_EXT = ".pdf";

/** Extract text from a PDF buffer (pdf-parse v2 PDFParse class). */
async function pdfToText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const res = await parser.getText();
    return res.text ?? "";
  } finally {
    await parser.destroy().catch(() => {});
  }
}

export type ImportResumeState = { error?: string };

/** Import an existing resume (.docx / .pdf), parse it deterministically (no AI), land in the editor. */
export async function importResumeAction(
  _prev: ImportResumeState,
  formData: FormData,
): Promise<ImportResumeState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  if (!user.onboardedAt) redirect("/onboarding");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a .docx or .pdf resume to import." };
  if (file.size > 15 * 1024 * 1024) return { error: "That file is too large (max 15 MB)." };
  const name = file.name.toLowerCase();

  let resume: Resume;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (name.endsWith(DOCX_EXT)) {
      resume = parseResumeDocx(buffer);
    } else if (name.endsWith(PDF_EXT)) {
      const text = await pdfToText(buffer);
      if (text.trim().length < 40) {
        return { error: "We couldn't read text from that PDF (it may be scanned/image-only). Try the .docx instead." };
      }
      resume = parseResumeText(text);
    } else {
      return { error: "Please upload a Word .docx or a .pdf resume." };
    }
  } catch {
    return { error: "We couldn't parse that resume. Try the .docx version, or generate a fresh one." };
  }

  let docId: string;
  try {
    const res = await importResume(user.id, resume);
    docId = res.docId;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Import failed. Please try again." };
  }
  redirect(`/resume/${docId}`);
}

/** Save in-browser edits: validate the structured data and re-render (format can't break). */
export async function updateResumeAction(formData: FormData): Promise<void> {
  const docId = String(formData.get("docId") ?? "");
  const user = await getOrCreateUser();
  if (!user || !docId) return;

  const raw = String(formData.get("resume") ?? "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  const result = ResumeSchema.safeParse(parsed);
  if (!result.success) return;

  await updateResume(user.id, docId, result.data);
  redirect(`/resume/${docId}`);
}

/** Re-score the ATS match against a new target role and/or a pasted job description. */
export async function rescoreResumeAction(formData: FormData): Promise<void> {
  const docId = String(formData.get("docId") ?? "");
  const user = await getOrCreateUser();
  if (!user || !docId) return;
  await rescoreResume(user.id, docId, {
    targetRole: String(formData.get("targetRole") ?? "").trim() || undefined,
    jobDescription: String(formData.get("jobDescription") ?? "").trim() || undefined,
  });
  redirect(`/resume/${docId}`);
}
