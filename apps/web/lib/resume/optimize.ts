import type { Resume, ResumeSkillGroup } from "@studentos/documents";
import { suggestResumeOptimizations, withAiRetry, type ResumeOptimizeCandidate } from "@studentos/ai";
import { analyzeAts } from "@/lib/resume/ats";
import { getResume, updateResume } from "@/lib/resume/generate";
import { METRIC_TOKEN } from "@/lib/resume/optimize-shared";

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const DIGIT_RUN_RE = /\d[\d\s().-]{5,}\d/; // catches phone-number-shaped digit runs

/** Defense in depth against the model trying to "fix" contact completeness by writing fake/real contact details into a text field. */
function looksLikeFabricatedContact(before: string, after: string): boolean {
  const stripped = after.replace(new RegExp(METRIC_TOKEN.replace(/[{}]/g, "\\$&"), "g"), "");
  const addedEmail = EMAIL_RE.test(after) && !EMAIL_RE.test(before);
  const addedDigitRun = DIGIT_RUN_RE.test(stripped) && !DIGIT_RUN_RE.test(before);
  return addedEmail || addedDigitRun;
}

/**
 * A typed, self-contained edit to a resume — the ONLY thing the client is allowed to send
 * back to apply a suggestion. `before` lets the server refuse to apply a stale suggestion
 * (the field changed since it was proposed) instead of silently clobbering it.
 */
export type ResumeEditPayload =
  | { kind: "summary"; before: string; after: string }
  | { kind: "bullet"; section: "experience" | "projects"; entryIndex: number; bulletIndex: number; before: string; after: string }
  | { kind: "skills"; before: ResumeSkillGroup[]; after: ResumeSkillGroup[] };

/**
 * A group of one or more edits that all target the same failing ATS check, applied and
 * verified atomically. Some checks (quantified bullets ≥40%, action-verb bullets ≥60%) are
 * thresholds across ALL bullets — fixing a single bullet in isolation never crosses the
 * threshold, so those edits must be proposed and approved together to genuinely move the
 * check from failing to passing.
 */
export type ResumeOptimization = {
  id: string;
  checkLabel: string;
  edits: ResumeEditPayload[];
  delta: number;
};

/** Read the current value an edit targets, or undefined if the path doesn't exist. */
function readTarget(resume: Resume, edit: ResumeEditPayload): unknown {
  if (edit.kind === "summary") return resume.summary ?? "";
  if (edit.kind === "skills") return resume.skills;
  const list = edit.section === "experience" ? resume.experience : resume.projects;
  return list[edit.entryIndex]?.bullets[edit.bulletIndex];
}

function sameValue(edit: ResumeEditPayload, target: unknown): boolean {
  return edit.kind === "skills" ? JSON.stringify(target) === JSON.stringify(edit.before) : target === edit.before;
}

/** Apply one edit in place on a (caller-owned) mutable resume clone. */
function applyEditInPlace(resume: Resume, edit: ResumeEditPayload): void {
  if (edit.kind === "summary") {
    resume.summary = edit.after;
  } else if (edit.kind === "skills") {
    resume.skills = edit.after;
  } else {
    const list = edit.section === "experience" ? resume.experience : resume.projects;
    const entry = list[edit.entryIndex];
    if (entry) entry.bullets[edit.bulletIndex] = edit.after;
  }
}

/** Apply a batch of edits to a resume, returning a new (structurally cloned) resume. */
function applyEdits(resume: Resume, edits: ResumeEditPayload[]): Resume {
  const clone: Resume = structuredClone(resume);
  for (const edit of edits) applyEditInPlace(clone, edit);
  return clone;
}

/** For scoring simulation only: fill any {{METRIC}} placeholder with a representative number. */
function fillMetricForScoring(edit: ResumeEditPayload): ResumeEditPayload {
  return edit.kind === "bullet" && edit.after.includes(METRIC_TOKEN) ? { ...edit, after: edit.after.replaceAll(METRIC_TOKEN, "1") } : edit;
}

/** Candidates already-evidenced-in-resume filter: only surface JD/role keywords the student already mentions somewhere. */
function surfaceableKeywords(resume: Resume, missing: string[]): string[] {
  const text = [
    resume.summary ?? "",
    ...resume.skills.flatMap((g) => g.items),
    ...resume.experience.flatMap((e) => e.bullets),
    ...resume.projects.flatMap((p) => p.bullets),
  ]
    .join(" ")
    .toLowerCase();
  return missing.filter((k) => text.includes(k.toLowerCase()));
}

function candidateToEdit(resume: Resume, c: ResumeOptimizeCandidate): ResumeEditPayload | null {
  if (c.kind === "summary") {
    return { kind: "summary", before: resume.summary ?? "", after: c.after };
  }
  if (c.kind === "skills") {
    return { kind: "skills", before: resume.skills, after: c.after };
  }
  const list = c.section === "experience" ? resume.experience : resume.projects;
  const before = list[c.entryIndex]?.bullets[c.bulletIndex];
  if (before === undefined) return null; // AI hallucinated an index — drop it.
  return { kind: "bullet", section: c.section, entryIndex: c.entryIndex, bulletIndex: c.bulletIndex, before, after: c.after };
}

export type ResumeOptimizationsResult = {
  suggestions: ResumeOptimization[];
  currentScore: number;
  potentialScore: number;
  /** Missing keywords the AI wouldn't add itself — self-tick to claim them (see `claimKeywords`). */
  unclaimedKeywords: UnclaimedKeyword[];
  /** The "Contact complete" check, if currently failing — no AI edit exists for this; the UI should point at the manual fields. */
  contactGap: { points: number } | null;
};

/**
 * Propose optimizations, cheaply (no persistence). Every suggestion returned has already
 * been proven, by simulation with the same `analyzeAts` used at save time, to raise the
 * score — nothing is shown on faith. Edits are grouped by the check they target and
 * validated as a batch, since threshold-based checks can't be flipped by a single edit alone.
 * Also surfaces the two gaps the AI is NOT allowed to close itself (unevidenced keywords,
 * contact info) so the UI can offer a real, honest path to close them too.
 */
export async function getResumeOptimizations(userId: string, docId: string): Promise<ResumeOptimizationsResult> {
  const current = await getResume(userId, docId);
  if (!current) throw new Error("Resume not found.");
  const { resume, meta } = current;
  const baseline = analyzeAts(resume, { targetRole: meta.targetRole, jobDescription: meta.jobDescription });

  const unclaimedKeywords = baseline.missing
    .map((keyword) => {
      const rescored = analyzeAts(claimKeywordsInResume(resume, [keyword]), { targetRole: meta.targetRole, jobDescription: meta.jobDescription });
      return { keyword, points: rescored.score - baseline.score };
    })
    .filter((k) => k.points > 0);

  const contactCheck = baseline.checks.find((c) => c.label === "Contact complete (email, phone, link)");
  let contactGap: { points: number } | null = null;
  if (contactCheck && !contactCheck.ok) {
    // Purely for showing an honest point estimate — never applied. Filling contact fields for real
    // requires the student's own info, entered manually in the editor.
    const withDummyContact: Resume = structuredClone(resume);
    withDummyContact.contact.phone ||= "0000000000";
    withDummyContact.contact.linkedin ||= "linkedin.com/in/placeholder";
    const rescored = analyzeAts(withDummyContact, { targetRole: meta.targetRole, jobDescription: meta.jobDescription });
    const points = rescored.score - baseline.score;
    if (points > 0) contactGap = { points };
  }

  const failingChecks = baseline.checks.filter((c) => !c.ok).map((c) => c.label);
  const candidates = await withAiRetry(
    () =>
      suggestResumeOptimizations({
        resume,
        failingChecks,
        surfaceableKeywords: surfaceableKeywords(resume, baseline.missing),
      }),
    { label: "resume.optimize" },
  );

  const byCheck = new Map<string, ResumeEditPayload[]>();
  for (const c of candidates) {
    const edit = candidateToEdit(resume, c);
    if (!edit) continue; // AI hallucinated an index — drop it.
    if (edit.kind !== "skills" && looksLikeFabricatedContact(edit.before, edit.after)) continue; // never trust a model-written contact detail
    const list = byCheck.get(c.checkLabel) ?? [];
    list.push(edit);
    byCheck.set(c.checkLabel, list);
  }

  const proven: ResumeOptimization[] = [];
  for (const [checkLabel, edits] of byCheck) {
    const forScoring = edits.map(fillMetricForScoring);
    const applied = applyEdits(resume, forScoring);
    const rescored = analyzeAts(applied, { targetRole: meta.targetRole, jobDescription: meta.jobDescription });
    const delta = rescored.score - baseline.score;
    if (delta <= 0) continue; // Doesn't genuinely help — don't show it, even as a group.
    proven.push({ id: `opt-${proven.length}`, checkLabel, edits, delta });
  }
  proven.sort((a, b) => b.delta - a.delta);

  // Simulate applying every kept group, in order, for an honest "potential score" preview.
  let cumulative = resume;
  for (const s of proven) cumulative = applyEdits(cumulative, s.edits.map(fillMetricForScoring));
  const potentialScore = analyzeAts(cumulative, { targetRole: meta.targetRole, jobDescription: meta.jobDescription }).score;

  return { suggestions: proven, currentScore: baseline.score, potentialScore, unclaimedKeywords, contactGap };
}

const CLAIMED_SKILLS_CATEGORY = "Additional Skills";

/**
 * Missing keywords the AI is NOT allowed to add on its own (not evidenced anywhere in the
 * resume — adding them would mean claiming a skill the student never mentioned). Instead we
 * offer them as a self-tick checklist: the student is the source of truth on their own
 * skills, same trust model as typing into any other resume field. Each keyword's point value
 * is the real, simulated delta of adding just that one keyword — no AI call, deterministic.
 */
export type UnclaimedKeyword = { keyword: string; points: number };

function claimKeywordsInResume(resume: Resume, keywords: string[]): Resume {
  const clone: Resume = structuredClone(resume);
  const existing = clone.skills.find((g) => g.category === CLAIMED_SKILLS_CATEGORY);
  if (existing) {
    existing.items = [...new Set([...existing.items, ...keywords])];
  } else {
    clone.skills.push({ category: CLAIMED_SKILLS_CATEGORY, items: keywords });
  }
  return clone;
}

/** Self-attested: the student ticked "I have this skill" — add it for real, re-render + re-score. */
export async function claimKeywords(userId: string, docId: string, keywords: string[]): Promise<{ ok: boolean; score?: number; error?: string }> {
  if (keywords.length === 0) return { ok: false, error: "Nothing to add." };
  const current = await getResume(userId, docId);
  if (!current) return { ok: false, error: "Resume not found." };
  const updated = claimKeywordsInResume(current.resume, keywords);
  await updateResume(userId, docId, updated);
  const after = await getResume(userId, docId);
  return { ok: true, score: after?.meta.ats?.score };
}

/**
 * Apply one approved group of edits for real: verify none are stale, merge them all into
 * the resume atomically, and re-render + re-score through the same `updateResume` path a
 * manual save uses.
 */
export async function applyResumeOptimization(
  userId: string,
  docId: string,
  edits: ResumeEditPayload[],
): Promise<{ ok: boolean; score?: number; error?: string }> {
  if (edits.length === 0) return { ok: false, error: "Nothing to apply." };
  const current = await getResume(userId, docId);
  if (!current) return { ok: false, error: "Resume not found." };
  const { resume } = current;

  const staleMsg = "That part of the resume changed since this suggestion was made — refresh suggestions and try again.";
  for (const edit of edits) {
    if (!sameValue(edit, readTarget(resume, edit))) return { ok: false, error: staleMsg };
  }

  const updated = applyEdits(resume, edits);
  await updateResume(userId, docId, updated);
  const after = await getResume(userId, docId);
  return { ok: true, score: after?.meta.ats?.score };
}
