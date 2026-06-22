import type { ReportContent } from "@studentos/documents";

/** Loose shape so quality works for both default reports and user-template reports. */
export type ReportLike = {
  abstract?: string;
  sections?: { heading: string; content: string }[];
  references?: string[];
};

/**
 * Plagiarism / AI-detection metrics for a generated document (PLAN.md §4, item #10).
 *
 * NOTE: these are deterministic STUBS so the feature is demoable with no paid API.
 * The real implementation calls a detector API (AI-detection + plagiarism) and an
 * AI humanizer rewrite — swap them in here without touching the UI or pipeline.
 */
export type QualityMetrics = {
  /** % likelihood the text reads as AI-generated (lower is better). */
  aiScore: number;
  /** % of text matching existing sources (lower is better). */
  plagiarismScore: number;
  humanized: boolean;
};

function serialize(content: ReportLike): string {
  const parts: string[] = [];
  if (content.abstract) parts.push(content.abstract);
  for (const s of content.sections ?? []) parts.push(`${s.heading} ${s.content}`);
  for (const r of content.references ?? []) parts.push(r);
  return parts.join(" ");
}

function seedFrom(text: string): number {
  let s = 0;
  for (let i = 0; i < text.length; i++) s = (s + text.charCodeAt(i) * (i + 1)) % 100000;
  return s;
}

/** Pre-humanize metrics: plausible "needs work" scores. */
export function analyzeReport(content: ReportLike): QualityMetrics {
  const seed = seedFrom(serialize(content));
  return {
    aiScore: 24 + (seed % 22), // ~24–45%
    plagiarismScore: 2 + (seed % 7), // ~2–8%
    humanized: false,
  };
}

/**
 * "Humanizes" the report. The stub keeps the text and just reflects improved
 * scores; the real version rewrites each section through an AI humanizer.
 */
export function humanizeReport(content: ReportContent): {
  content: ReportContent;
  metrics: QualityMetrics;
} {
  const seed = seedFrom(serialize(content));
  return {
    content, // real humanizer returns rewritten sections here
    metrics: {
      aiScore: 3 + (seed % 6), // ~3–8%
      plagiarismScore: 1 + (seed % 3), // ~1–3%
      humanized: true,
    },
  };
}
