import type { Resume } from "@studentos/documents";

/**
 * ATS analysis for a resume — a genuine (not stubbed) heuristic. Two halves:
 *  1) Keyword coverage vs the target role (or a pasted job description).
 *  2) Structural checks ATS parsers + recruiters care about (summary, quantified
 *     bullets, action verbs, categorized skills, contact completeness).
 * Our renderer is single-column / no-graphics by construction, so those always pass.
 */
export type AtsCheck = { label: string; ok: boolean; weight: number; detail?: string };
export type AtsReport = {
  score: number; // 0–100
  keywordCoverage: number; // 0–100
  matched: string[];
  missing: string[];
  checks: AtsCheck[];
  suggestions: string[];
};

// Common keyword sets by role family. Picked by substring match on the target role.
const ROLE_KEYWORDS: { match: RegExp; keywords: string[] }[] = [
  { match: /front|ui|web/i, keywords: ["react", "javascript", "typescript", "html", "css", "responsive", "accessibility", "rest api", "git"] },
  { match: /back|api|server/i, keywords: ["node", "api", "rest", "database", "sql", "docker", "authentication", "microservices", "caching", "git"] },
  { match: /full.?stack/i, keywords: ["react", "node", "typescript", "api", "database", "sql", "docker", "rest", "git", "ci/cd"] },
  { match: /\b(ml|machine|ai|deep|nlp)\b/i, keywords: ["python", "pytorch", "tensorflow", "machine learning", "nlp", "data", "model", "numpy", "pandas", "scikit"] },
  { match: /data\b|analyt/i, keywords: ["python", "sql", "pandas", "etl", "data visualization", "statistics", "tableau", "excel", "data pipeline"] },
  { match: /devops|sre|cloud|infra/i, keywords: ["docker", "kubernetes", "ci/cd", "aws", "terraform", "linux", "monitoring", "automation", "github actions"] },
  { match: /mobile|android|ios|flutter/i, keywords: ["react native", "android", "ios", "kotlin", "swift", "flutter", "rest api", "git"] },
  { match: /embedded|iot|electr/i, keywords: ["c", "c++", "microcontroller", "rtos", "sensors", "firmware", "i2c", "embedded", "circuit"] },
];
const GENERIC_KEYWORDS = ["git", "data structures", "algorithms", "oop", "problem solving", "rest api", "sql", "testing"];

const ACTION_VERBS = new Set([
  "architected", "built", "designed", "engineered", "implemented", "developed", "created", "led", "shipped",
  "delivered", "optimized", "automated", "reduced", "improved", "launched", "owned", "collaborated", "integrated",
  "deployed", "scaled", "migrated", "refactored", "analyzed", "managed", "drove", "spearheaded", "added",
]);

function resumeText(r: Resume): string {
  const parts: string[] = [];
  if (r.summary) parts.push(r.summary);
  for (const g of r.skills) parts.push(`${g.category} ${g.items.join(" ")}`);
  for (const e of r.experience) parts.push(`${e.organization} ${e.role ?? ""} ${e.bullets.join(" ")}`);
  for (const p of r.projects) parts.push(`${p.name} ${p.role ?? ""} ${p.bullets.join(" ")}`);
  for (const ed of r.education) parts.push(`${ed.institution} ${ed.degree ?? ""}`);
  return parts.join(" ").toLowerCase();
}

const STOPWORDS = new Set("the a an and or for to of in on with at by from is are be as your you we our using used build built into per via".split(" "));

/** Pull candidate keywords from a pasted job description (frequency, minus stopwords). */
function keywordsFromJD(jd: string): string[] {
  const freq = new Map<string, number>();
  for (const raw of jd.toLowerCase().match(/[a-z][a-z+.#/-]{2,}/g) ?? []) {
    if (STOPWORDS.has(raw)) continue;
    freq.set(raw, (freq.get(raw) ?? 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16).map(([k]) => k);
}

function targetKeywords(targetRole?: string, jobDescription?: string): string[] {
  if (jobDescription && jobDescription.trim().length > 40) return keywordsFromJD(jobDescription);
  const role = targetRole ?? "";
  const set = ROLE_KEYWORDS.find((r) => r.match.test(role));
  return [...new Set([...(set?.keywords ?? GENERIC_KEYWORDS)])];
}

export function analyzeAts(
  resume: Resume,
  opts: { targetRole?: string; jobDescription?: string } = {},
): AtsReport {
  const text = resumeText(resume);
  const keywords = targetKeywords(opts.targetRole, opts.jobDescription);
  const matched = keywords.filter((k) => text.includes(k.toLowerCase()));
  const missing = keywords.filter((k) => !text.includes(k.toLowerCase()));
  const keywordCoverage = keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0;

  const allBullets = [...resume.experience.flatMap((e) => e.bullets), ...resume.projects.flatMap((p) => p.bullets)];
  const quantified = allBullets.filter((b) => /\d/.test(b)).length;
  const actionLed = allBullets.filter((b) => ACTION_VERBS.has(b.trim().split(/\s+/)[0]?.toLowerCase() ?? "")).length;
  const c = resume.contact;
  const contactComplete = !!c.email && !!c.phone && !!(c.linkedin || c.github);

  const checks: AtsCheck[] = [
    { label: "Professional summary present", ok: !!resume.summary?.trim(), weight: 8 },
    { label: "Skills grouped into categories", ok: resume.skills.length >= 2, weight: 8 },
    { label: "Has projects or experience", ok: resume.experience.length + resume.projects.length > 0, weight: 10 },
    {
      label: "Bullets quantify impact (numbers/metrics)",
      ok: allBullets.length > 0 && quantified / allBullets.length >= 0.4,
      weight: 12,
      detail: allBullets.length ? `${quantified}/${allBullets.length} bullets have metrics` : undefined,
    },
    {
      label: "Bullets start with action verbs",
      ok: allBullets.length > 0 && actionLed / allBullets.length >= 0.6,
      weight: 8,
      detail: allBullets.length ? `${actionLed}/${allBullets.length} bullets` : undefined,
    },
    { label: "Contact complete (email, phone, link)", ok: contactComplete, weight: 6 },
    { label: "Single-column, no tables/graphics (ATS-parseable)", ok: true, weight: 8 },
    { label: "Standard section headings", ok: true, weight: 4 },
  ];

  const structuralPossible = checks.reduce((s, ch) => s + ch.weight, 0);
  const structuralGot = checks.reduce((s, ch) => s + (ch.ok ? ch.weight : 0), 0);
  const structuralScore = structuralGot / structuralPossible; // 0–1

  // 55% keyword match, 45% structure.
  const score = Math.round(keywordCoverage * 0.55 + structuralScore * 100 * 0.45);

  const suggestions: string[] = [];
  if (missing.length) suggestions.push(`Add or surface these role keywords: ${missing.slice(0, 6).join(", ")}.`);
  if (allBullets.length && quantified / allBullets.length < 0.4)
    suggestions.push("Quantify more bullets — add numbers (users, %, time saved).");
  if (allBullets.length && actionLed / allBullets.length < 0.6)
    suggestions.push("Start more bullets with a strong action verb (Built, Architected, Reduced…).");
  if (!contactComplete) suggestions.push("Complete your contact line — email, phone, and a LinkedIn/GitHub link.");
  if (!resume.summary?.trim()) suggestions.push("Add a 2–3 line professional summary tailored to the role.");

  return { score, keywordCoverage, matched, missing, checks, suggestions };
}
