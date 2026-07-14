"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { type ClarifyQuestion } from "@studentos/ai";
import { putObject, keys } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";
import { createReportDoc, runReportGeneration, resumeReportGeneration, markReportGenerating, updateReportContent } from "@/lib/reports/generate";
import type { ReportLike } from "@/lib/quality";
import { QuotaExceededError } from "@/lib/entitlements";
import { rateLimit, friendlyError } from "@/lib/reliability";
import { REPORT_TYPES } from "@/lib/constants";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type ReportFormState = {
  error?: string;
  upgrade?: boolean;
  /** When set, the UI shows these clarifying questions instead of generating. */
  questions?: ClarifyQuestion[];
  /** Carries an uploaded template key across the clarify round-trip. */
  templateKey?: string;
};

export async function generateReportAction(
  _prev: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  if (!user.onboardedAt) redirect("/onboarding");
  try { await rateLimit(user.id, "report"); } catch (e) { return { error: friendlyError(e) }; }

  const title = String(formData.get("title") ?? "").trim();
  const reportType = String(formData.get("reportType") ?? "").trim();
  const guidelines = String(formData.get("guidelines") ?? "").trim() || undefined;

  if (title.length < 4) return { error: "Please enter a clearer report topic (at least 4 characters)." };
  if (!REPORT_TYPES.some((t) => t.value === reportType)) return { error: "Please choose a report type." };

  // Optional: the user's own template.
  let templateKey = String(formData.get("templateKey") ?? "") || undefined;
  if (!templateKey) {
    const file = formData.get("template");
    if (file instanceof File && file.size > 0) {
      if (!file.name.toLowerCase().endsWith(".docx")) {
        return { error: "Please upload a Word .docx template." };
      }
      if (file.size > 10 * 1024 * 1024) return { error: "Template is too large (max 10 MB)." };
      templateKey = keys.upload(user.id, crypto.randomUUID(), "docx");
      await putObject(templateKey, Buffer.from(await file.arrayBuffer()), DOCX_MIME);
    }
  }

  const input = { userId: user.id, title, reportType, guidelines, templateKey, interactive: true };

  // Create the doc fast, then generate in the BACKGROUND so the request returns immediately.
  // This prevents the multi-minute server action that was expiring the session and wasting credits.
  let docId: string;
  try {
    docId = await createReportDoc(input);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return {
        error: `You've used all ${err.limit} free reports this month. Upgrade to Pro for unlimited reports.`,
        upgrade: true,
      };
    }
    return { error: friendlyError(err) };
  }

  after(() => runReportGeneration(docId, input));
  // The report page shows live progress, then clarifying questions or the finished report.
  redirect(`/reports/${docId}`);
}

/** Resume a report paused at NEEDS_INPUT, with the user's answers to the mid-generation questions. */
export async function resumeReportAction(formData: FormData): Promise<void> {
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

  // Flip to GENERATING now (so the page shows progress on redirect), then finish in the background.
  await markReportGenerating(docId, user.id);
  after(() => resumeReportGeneration(user.id, docId, answers));
  redirect(`/reports/${docId}`);
}

/** Save in-browser edits to a report's text (basic editor on the report page). */
export async function updateReportAction(formData: FormData): Promise<void> {
  const user = await getOrCreateUser();
  const docId = String(formData.get("docId") ?? "");
  if (!user || !docId) return;

  const raw = String(formData.get("report") ?? "");
  if (raw.length > 500_000) return; // a real report's JSON never gets close to this
  let parsed: ReportLike;
  try {
    parsed = JSON.parse(raw) as ReportLike;
  } catch {
    return;
  }
  // Light normalization — keep only the fields we render/store, bounded so a crafted payload
  // can't write an arbitrarily huge document (persisted, then re-rendered to DOCX).
  const MAX_SECTIONS = 50;
  const MAX_HEADING_LENGTH = 300;
  const MAX_CONTENT_LENGTH = 20_000;
  const MAX_REFERENCES = 200;
  const MAX_REFERENCE_LENGTH = 500;
  const data: ReportLike = {
    abstract: typeof parsed.abstract === "string" ? parsed.abstract.slice(0, 5000) : undefined,
    sections: Array.isArray(parsed.sections)
      ? parsed.sections
          .filter((s) => s && typeof s.heading === "string")
          .slice(0, MAX_SECTIONS)
          .map((s) => ({
            heading: s.heading.slice(0, MAX_HEADING_LENGTH),
            content: String(s.content ?? "").slice(0, MAX_CONTENT_LENGTH),
          }))
      : [],
    references: Array.isArray(parsed.references)
      ? parsed.references.map(String).slice(0, MAX_REFERENCES).map((r) => r.slice(0, MAX_REFERENCE_LENGTH))
      : undefined,
  };

  await updateReportContent(user.id, docId, data);
  redirect(`/reports/${docId}`);
}
