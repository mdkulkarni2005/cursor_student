import { generateObject, type ModelMessage } from "ai";
import { z } from "zod";
import { BOQEstimateSchema, type BOQEstimate } from "@studentos/documents";
import { cachedSystem, logCacheUsage } from "./cache";
import { costCentsFromUsage } from "./pricing";

const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

export type BOQTurn = { speaker: "student" | "tutor"; content: string };

export type BOQRequest = {
  dimensionsText?: string;
  instructions?: string;
  subject?: string;
  image?: { data: Uint8Array; mediaType: string };
};

function stubEstimate(req: BOQRequest): BOQEstimate {
  return {
    title: req.dimensionsText?.slice(0, 60) || "BOQ Estimate",
    items: [
      { description: "Excavation for foundation", unit: "cum", quantity: 10, rate: 250, amount: 2500 },
      { description: "PCC 1:4:8 in foundation", unit: "cum", quantity: 4, rate: 4500, amount: 18000 },
    ],
    assumptions: ["Rates are typical placeholder values for local development."],
    totalAmount: 20500,
  };
}

export type GenerateBOQResult = { estimate: BOQEstimate; model: string; costCents: number };

export async function generateBoqEstimate(req: BOQRequest): Promise<GenerateBOQResult> {
  if (process.env.AI_DRIVER === "stub") {
    return { estimate: BOQEstimateSchema.parse(stubEstimate(req)), model: "stub", costCents: 0 };
  }

  const system =
    "You are a civil engineering quantity surveyor. From the given dimensions/drawing (which may be a photo), produce a Bill of Quantities: itemized description, unit (cum/sqm/kg/nos/etc.), quantity, rate, and amount = quantity × rate, plus a grand total. Never invent dimensions that weren't given — if a rate isn't given, use a typical current market rate and list it under assumptions.";

  const textPrompt = [
    req.subject ? `Subject: ${req.subject}` : "",
    req.dimensionsText ? `Dimensions / scope: ${req.dimensionsText}` : "The dimensions/drawing are in the attached image.",
    req.instructions ? `Additional instructions: ${req.instructions}` : "",
  ].filter(Boolean).join("\n");

  const messages: ModelMessage[] = [
    {
      role: "user",
      content: req.image
        ? [{ type: "text", text: textPrompt }, { type: "image", image: req.image.data, mediaType: req.image.mediaType }]
        : [{ type: "text", text: textPrompt }],
    },
  ];

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object, usage } = await generateObject({ model, schema: BOQEstimateSchema, system, messages });
      return { estimate: object, model, costCents: costCentsFromUsage(model, usage) };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`BOQ estimation failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

// ---------------- Multi-turn feedback loop ----------------

const BOQFollowUpSchema = z.object({
  reply: z.string().min(1),
  revisedEstimate: BOQEstimateSchema.nullish(),
});
export type BOQFollowUp = { reply: string; revisedEstimate?: BOQEstimate | null };

export type BOQFollowUpRequest = {
  estimate: BOQEstimate;
  conversation: BOQTurn[];
  message: string;
  subject?: string;
};

function stubFollowUp(req: BOQFollowUpRequest): BOQFollowUp {
  return { reply: `About "${req.message.slice(0, 80)}": check the relevant item's quantity/rate and let me know if it needs correcting. (Local preview.)` };
}

export async function boqFollowUp(req: BOQFollowUpRequest): Promise<{ result: BOQFollowUp; model: string; costCents: number }> {
  if (process.env.AI_DRIVER === "stub") {
    return { result: stubFollowUp(req), model: "stub", costCents: 0 };
  }

  const cachedPrefix = [
    "You are helping a student revise their BOQ estimate. They may point out a wrong quantity/rate or ask to add/remove an item.",
    "Answer clearly. If their feedback means the estimate should change, return a FULL revised estimate (with a recomputed totalAmount) in revisedEstimate; otherwise omit it.",
    "Never invent dimensions that weren't given.",
    req.subject ? `Subject: ${req.subject}` : "",
    `Current estimate:\n${JSON.stringify(req.estimate)}`,
  ].filter(Boolean).join("\n\n");
  const prompt = [
    req.conversation.length ? `Conversation so far:\n${req.conversation.map((t) => `${t.speaker}: ${t.content}`).join("\n")}` : "",
    `Student's new message: ${req.message}`,
  ].filter(Boolean).join("\n\n");
  const messages: ModelMessage[] = [cachedSystem(cachedPrefix), { role: "user", content: prompt }];

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object, providerMetadata, usage } = await generateObject({ model, schema: BOQFollowUpSchema, messages });
      logCacheUsage("boq.followup", providerMetadata);
      return { result: object, model, costCents: costCentsFromUsage(model, usage) };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`BOQ follow-up failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}
