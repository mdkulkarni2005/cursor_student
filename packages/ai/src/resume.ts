import { generateObject } from "ai";
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

export type GenerateResumeResult = { resume: Resume; model: string };

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
    return { resume: { contact: req.contact, ...body }, model: "stub" };
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
      const { object } = await generateObject({ model, schema: ResumeBodySchema, system, prompt });
      return { resume: { contact: req.contact, ...object }, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Resume generation failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}
