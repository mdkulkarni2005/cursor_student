import { generateObject, type ModelMessage } from "ai";
import { z } from "zod";
import { LabReportSolutionSchema, type LabReportSolution } from "@studentos/documents";
import { cachedSystem, logCacheUsage } from "./cache";
import { costCentsFromUsage } from "./pricing";

const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

export type LabReportTurn = { speaker: "student" | "tutor"; content: string };

export type LabReportRequest = {
  /** Raw readings typed by the student, or a description of what's in the uploaded photo. */
  readingsText?: string;
  instructions?: string;
  subject?: string;
  /** Optional photo of the raw readings/graph for vision models. */
  image?: { data: Uint8Array; mediaType: string };
};

function stubSolution(req: LabReportRequest): LabReportSolution {
  const q = req.readingsText?.slice(0, 160) || "the uploaded readings";
  return {
    aim: `Determine the result from: ${q}. (Locally stubbed — the real model reads the actual readings, including photos.)`,
    apparatus: ["Apparatus as per lab manual"],
    theory: "Brief theory placeholder for local development.",
    procedure: ["Set up the apparatus.", "Record readings.", "Repeat for consistency."],
    observations: { columns: ["Trial", "Reading"], rows: [["1", "—"], ["2", "—"]] },
    result: "The result follows from the observations above. (Stubbed for local development.)",
    conclusion: "The experiment confirms the expected relationship. (Stubbed for local development.)",
  };
}

export type GenerateLabReportResult = { solution: LabReportSolution; model: string; costCents: number };

export async function generateLabReportSolution(
  req: LabReportRequest,
): Promise<GenerateLabReportResult> {
  if (process.env.AI_DRIVER === "stub") {
    return { solution: LabReportSolutionSchema.parse(stubSolution(req)), model: "stub", costCents: 0 };
  }

  const system =
    "You are helping an engineering student write up a lab report from their raw readings. Read the readings (which may be a photo of a table or a hand-drawn graph), then produce a complete, correctly formatted lab report: aim, apparatus, theory, procedure, an observation table, calculations, result, and conclusion. Use the actual numbers given — never invent data.";

  const textPrompt = [
    req.subject ? `Subject/branch: ${req.subject}` : "",
    req.readingsText ? `Raw readings / experiment description: ${req.readingsText}` : "The readings are in the attached image.",
    req.instructions ? `Additional instructions: ${req.instructions}` : "",
    "Build the observation table from the actual readings provided. Include calculations only if the experiment requires computing a result from the readings.",
  ]
    .filter(Boolean)
    .join("\n");

  const messages: ModelMessage[] = [
    {
      role: "user",
      content: req.image
        ? [
            { type: "text", text: textPrompt },
            { type: "image", image: req.image.data, mediaType: req.image.mediaType },
          ]
        : [{ type: "text", text: textPrompt }],
    },
  ];

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object, usage } = await generateObject({ model, schema: LabReportSolutionSchema, system, messages });
      return { solution: object, model, costCents: costCentsFromUsage(model, usage) };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Lab report generation failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

// ---------------- Multi-turn feedback loop (mirrors assignment follow-up) ----------------

const LabReportFollowUpSchema = z.object({
  reply: z.string().min(1),
  revisedSolution: LabReportSolutionSchema.nullish(),
});
export type LabReportFollowUp = { reply: string; revisedSolution?: LabReportSolution | null };

export type LabReportFollowUpRequest = {
  solution: LabReportSolution;
  conversation: LabReportTurn[];
  message: string;
  subject?: string;
};

function stubFollowUp(req: LabReportFollowUpRequest): LabReportFollowUp {
  const m = req.message.toLowerCase();
  const wantsChange = /(redo|wrong|change|instead|mistake|incorrect|add|reading)/.test(m);
  if (wantsChange) {
    return {
      reply: `Good catch — I've updated the report to address "${req.message.slice(0, 80)}". (Local preview.)`,
      revisedSolution: {
        ...req.solution,
        conclusion: `${req.solution.conclusion} (Revised per your note: ${req.message.slice(0, 80)}.)`,
      },
    };
  }
  return {
    reply: `About "${req.message.slice(0, 80)}": here's the reasoning — check the observation table against your raw readings and let me know if a value needs correcting. (Local preview.)`,
  };
}

/** Multi-turn tutoring on a lab report: answer a follow-up and revise when warranted. */
export async function labReportFollowUp(
  req: LabReportFollowUpRequest,
): Promise<{ result: LabReportFollowUp; model: string; costCents: number }> {
  if (process.env.AI_DRIVER === "stub") {
    return { result: stubFollowUp(req), model: "stub", costCents: 0 };
  }

  const cachedPrefix = [
    "You are helping a student revise their lab report. They may point out a wrong reading, ask about the calculation, or want the conclusion reworded.",
    "Answer clearly. If their feedback means the report should change, return a FULL revised report in revisedSolution; otherwise omit it (just reply).",
    "Never change the report unnecessarily, and never invent new readings that weren't given.",
    req.subject ? `Subject/branch: ${req.subject}` : "",
    `Current report:\n${JSON.stringify(req.solution)}`,
  ].filter(Boolean).join("\n\n");
  const prompt = [
    req.conversation.length ? `Conversation so far:\n${req.conversation.map((t) => `${t.speaker}: ${t.content}`).join("\n")}` : "",
    `Student's new message: ${req.message}`,
  ].filter(Boolean).join("\n\n");
  const messages: ModelMessage[] = [cachedSystem(cachedPrefix), { role: "user", content: prompt }];

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object, providerMetadata, usage } = await generateObject({ model, schema: LabReportFollowUpSchema, messages });
      logCacheUsage("lab-report.followup", providerMetadata);
      return { result: object, model, costCents: costCentsFromUsage(model, usage) };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Lab report follow-up failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}
