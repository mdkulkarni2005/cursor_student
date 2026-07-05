import { generateObject } from "ai";
import { costCentsFromUsage } from "./pricing";
import { z } from "zod";
import {
  ResumeSkillGroupSchema,
  ResumeExperienceSchema,
  ResumeProjectSchema,
  ResumeEducationSchema,
  type Resume,
  type ResumeContact,
} from "@studentos/documents";

const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

/**
 * Resume content generation. The model produces ONLY the content (summary, ATS-optimized
 * bullets, categorized skills, experience/projects/education) — contact details are injected
 * from the verified profile, never invented. The deterministic renderer in @studentos/documents
 * owns the format (the house ATS layout).
 */
const ResumeBodySchema = z.object({
  summary: z.string(),
  skills: z.array(ResumeSkillGroupSchema).default([]),
  experience: z.array(ResumeExperienceSchema).default([]),
  projects: z.array(ResumeProjectSchema).default([]),
  education: z.array(ResumeEducationSchema).default([]),
});

export type GenerateResumeRequest = {
  /** From the profile + form — injected, not generated. */
  contact: ResumeContact;
  targetRole?: string;
  department?: string;
  /** Free-form notes: experiences, projects, skills, achievements in any shape. */
  rawNotes?: string;
  /** Extra context (e.g. answers folded in from the clarify loop). */
  guidelines?: string;
  /** When editing/refining an existing resume rather than generating fresh. */
  existing?: Resume;
};

export type GenerateResumeResult = { resume: Resume; model: string; costCents: number };

function stubBody(req: GenerateResumeRequest): z.infer<typeof ResumeBodySchema> {
  const role = req.targetRole?.trim() || "Software Engineer";
  const dept = req.department?.trim() || "Engineering";
  const notes = req.rawNotes?.trim();
  return {
    summary:
      `${dept} student targeting ${role} roles. ` +
      (notes
        ? `Hands-on builder: ${notes.slice(0, 160)}.`
        : "Builds real projects end-to-end and ships working software.") +
      " Eager to apply practical skills to real-world problems.",
    skills: [
      { category: "Languages", items: ["Python", "JavaScript", "C++"] },
      { category: "Tools", items: ["Git", "VS Code", "Linux"] },
    ],
    experience: [],
    projects: [
      {
        name: notes ? notes.split(/[.\n]/)[0]!.slice(0, 60) : "Course Project",
        role: "Developer",
        dates: { start: "2025", end: "Present" },
        bullets: [
          "Designed and built the core feature set, owning it end-to-end from idea to working demo.",
          "Applied clean, tested code and shipped iteratively based on user feedback.",
        ],
      },
    ],
    education: [
      {
        institution: req.contact.location ? `College, ${req.contact.location}` : "College",
        degree: `Bachelor's, ${dept}`,
        dates: { start: "2022", end: "2026" },
      },
    ],
  };
}

export async function generateResume(req: GenerateResumeRequest): Promise<GenerateResumeResult> {
  if (process.env.AI_DRIVER === "stub") {
    const body = ResumeBodySchema.parse(stubBody(req));
    return { resume: { contact: req.contact, ...body }, model: "stub", costCents: 0 };
  }

  const system = [
    "You are an expert technical resume writer optimizing for ATS (Applicant Tracking Systems).",
    "Rules:",
    "- Every experience/project bullet: start with a strong past-tense action verb; quantify impact where possible (users, %, time saved); be specific and truthful — never invent numbers or facts the student didn't provide.",
    "- Write a 2–3 sentence professional summary tailored to the target role.",
    "- Group skills into labeled categories (Languages, Frontend, Backend, Tools, etc.).",
    "- Mirror keywords from the target role so the resume passes ATS keyword screens.",
    "- Do NOT fabricate experience. If the student has none, leave experience empty and lean on projects.",
    "- Output content only — no contact details, no formatting.",
  ].join("\n");

  const prompt = [
    `Target role: ${req.targetRole ?? "software engineering / technical roles"}.`,
    req.department ? `Department: ${req.department}.` : "",
    req.existing ? `Refine this existing resume content: ${JSON.stringify({ summary: req.existing.summary, skills: req.existing.skills, experience: req.existing.experience, projects: req.existing.projects, education: req.existing.education })}` : "",
    req.rawNotes ? `The student's notes (experiences, projects, skills, achievements):\n${req.rawNotes}` : "",
    req.guidelines ? `Additional context:\n${req.guidelines}` : "",
    "Produce ATS-optimized resume content.",
  ]
    .filter(Boolean)
    .join("\n");

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object, usage } = await generateObject({ model, schema: ResumeBodySchema, system, prompt });
      return { resume: { contact: req.contact, ...object }, model, costCents: costCentsFromUsage(model, usage) };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Resume generation failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

/**
 * "Optimize resume" candidate edits — targeted rewrites for specific failing ATS checks.
 * The model only proposes WHERE and WHAT to change; the caller (apps/web) reads the
 * current "before" value itself from the resume (never trusts the model's memory of it),
 * re-scores each candidate with the real ATS heuristic, and drops anything that doesn't
 * genuinely raise the score. Never invent employers, numbers, or skills — use the
 * {{METRIC}} placeholder when a bullet needs a number that isn't in the source text.
 */
const ResumeOptimizeCandidateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("summary"), checkLabel: z.string(), after: z.string() }),
  z.object({
    kind: z.literal("bullet"),
    checkLabel: z.string(),
    section: z.enum(["experience", "projects"]),
    entryIndex: z.number().int().min(0),
    bulletIndex: z.number().int().min(0),
    after: z.string(),
  }),
  z.object({ kind: z.literal("skills"), checkLabel: z.string(), after: z.array(ResumeSkillGroupSchema) }),
]);
const ResumeOptimizeCandidatesSchema = z.object({ suggestions: z.array(ResumeOptimizeCandidateSchema).max(10) });

export type ResumeOptimizeCandidate = z.infer<typeof ResumeOptimizeCandidateSchema>;

export type ResumeOptimizeRequest = {
  resume: Resume;
  /** Labels of `AtsCheck`s currently failing, e.g. "Bullets start with action verbs". */
  failingChecks: string[];
  /** Missing target-role/JD keywords that already appear as substrings somewhere in the resume text — safe to surface, never fabricate the rest. */
  surfaceableKeywords: string[];
};

function stubOptimizeCandidates(req: ResumeOptimizeRequest): z.infer<typeof ResumeOptimizeCandidatesSchema> {
  const suggestions: ResumeOptimizeCandidate[] = [];
  if (!req.resume.summary?.trim() && req.failingChecks.includes("Professional summary present")) {
    suggestions.push({ kind: "summary", checkLabel: "Professional summary present", after: "Motivated engineering student who builds and ships real projects end-to-end." });
  }
  const firstBulletIdx = req.resume.experience.length
    ? { section: "experience" as const, entryIndex: 0 }
    : req.resume.projects.length
      ? { section: "projects" as const, entryIndex: 0 }
      : null;
  if (firstBulletIdx && req.failingChecks.includes("Bullets quantify impact (numbers/metrics)")) {
    suggestions.push({ kind: "bullet", checkLabel: "Bullets quantify impact (numbers/metrics)", ...firstBulletIdx, bulletIndex: 0, after: "Built and shipped the core feature, cutting manual effort by {{METRIC}}." });
  }
  return ResumeOptimizeCandidatesSchema.parse({ suggestions });
}

export async function suggestResumeOptimizations(req: ResumeOptimizeRequest): Promise<ResumeOptimizeCandidate[]> {
  if (process.env.AI_DRIVER === "stub") {
    return stubOptimizeCandidates(req).suggestions;
  }
  if (req.failingChecks.length === 0 && req.surfaceableKeywords.length === 0) return [];

  const system = [
    "You are an expert ATS resume editor. You propose small, targeted rewrites for a resume that already exists — you do not write a new resume.",
    "You can ONLY produce three kinds of edits: 'summary' (rewrite the summary paragraph), 'bullet' (rewrite one experience/project bullet), 'skills' (regroup/relabel the skills list). There is no way to edit contact info (name/email/phone/location/links) — if the only failing check is about contact completeness, do not propose anything for it, and NEVER write contact details (an email address, phone number, or profile URL) into the summary, a bullet, or skills as a workaround.",
    "Rules:",
    "- NEVER invent employers, dates, numbers, contact details, or skills the student didn't provide.",
    "- If a bullet needs a metric (%, count, time saved) that isn't already in its text, write the bullet with the literal placeholder token {{METRIC}} where the number goes — do not guess a number.",
    "- Bullets should start with a strong past-tense action verb.",
    "- Only propose 'skills' edits that regroup/relabel skills the student already listed, or add a skill keyword that is already evidenced elsewhere in the resume text (e.g. mentioned in a bullet) — never add a skill with no evidence in the resume.",
    "- Propose at most one edit per failing check, only where you can do it truthfully, and skip checks you have no valid edit kind for (e.g. contact completeness, keyword coverage with no evidence).",
    "- entryIndex/bulletIndex must be valid 0-based indices into the resume you were given.",
  ].join("\n");

  const prompt = [
    `Resume (JSON): ${JSON.stringify({ summary: req.resume.summary, skills: req.resume.skills, experience: req.resume.experience, projects: req.resume.projects })}`,
    `Failing ATS checks to address: ${req.failingChecks.join("; ") || "none"}.`,
    `Keywords worth surfacing more prominently (already evidenced in the resume text): ${req.surfaceableKeywords.join(", ") || "none"}.`,
    "Propose targeted edits.",
  ].join("\n");

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({ model, schema: ResumeOptimizeCandidatesSchema, system, prompt });
      return object.suggestions;
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Resume optimize suggestions failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}
