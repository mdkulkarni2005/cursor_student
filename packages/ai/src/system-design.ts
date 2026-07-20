import { generateObject } from "ai";
import { z } from "zod";

const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

/**
 * System design architecture REVIEW — the student drops components (load balancer, DB, cache,
 * API server, queue, ...) onto a canvas and wires them up; this reviews the resulting graph
 * against the scenario, calling out bottlenecks/missing pieces rather than grading correctness
 * (there's no single "right" architecture).
 */
export const SystemDesignReviewSchema = z.object({
  strengths: z.array(z.string()).default([]),
  bottlenecks: z.array(z.string()).default([]),
  missingComponents: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
  overallFeedback: z.string().min(1),
});
export type SystemDesignReview = z.infer<typeof SystemDesignReviewSchema>;

export type SystemDesignNode = { id: string; type: string; label: string };
export type SystemDesignEdge = { source: string; target: string; label?: string };

export type SystemDesignReviewRequest = {
  scenarioTitle: string;
  scenarioPrompt: string;
  nodes: SystemDesignNode[];
  edges: SystemDesignEdge[];
};

function stubReview(req: SystemDesignReviewRequest): SystemDesignReview {
  const types = new Set(req.nodes.map((n) => n.type));
  const missing: string[] = [];
  if (!types.has("cache")) missing.push("Cache — reduce repeated load on your database.");
  if (!types.has("load-balancer") && req.nodes.length > 2) missing.push("Load Balancer — spread traffic across multiple API servers.");
  if (req.edges.length === 0 && req.nodes.length > 1) missing.push("Nothing is connected yet — wire your components together.");

  return {
    strengths: req.nodes.length > 0 ? [`You've placed ${req.nodes.length} component(s): ${[...types].join(", ")}.`] : [],
    bottlenecks: types.has("database") && !types.has("cache") ? ["Every request appears to hit the database directly — this will bottleneck under load."] : [],
    missingComponents: missing,
    suggestions: [
      "Think about what happens at 100x the traffic — where does this design break first?",
      "Label your edges with what data or request flows across them.",
    ],
    overallFeedback: `For "${req.scenarioTitle}", this is a reasonable starting point. (Local preview review.)`,
  };
}

export async function reviewSystemDesign(req: SystemDesignReviewRequest): Promise<{ review: SystemDesignReview; model: string }> {
  if (process.env.AI_DRIVER === "stub") {
    return { review: SystemDesignReviewSchema.parse(stubReview(req)), model: "stub" };
  }

  const system = [
    "You are a system design interviewer reviewing a student's architecture diagram for a given scenario.",
    "The diagram is a graph of components (load balancers, databases, caches, API servers, queues, etc.) and directed edges showing how they connect.",
    "Identify real strengths, concrete bottlenecks (single points of failure, unbounded fan-out, missing caching, etc.), and components that are missing for this scenario at scale.",
    "Be specific and reference the actual components/edges present — don't give generic advice unrelated to what's on the canvas.",
    "Be constructive and concise.",
  ].join("\n");
  const prompt = [
    `Scenario: ${req.scenarioTitle}`,
    `Prompt: ${req.scenarioPrompt}`,
    `Components on canvas: ${req.nodes.map((n) => `${n.label} (${n.type})`).join(", ") || "none"}`,
    `Connections: ${req.edges.map((e) => `${e.source} -> ${e.target}${e.label ? ` [${e.label}]` : ""}`).join("; ") || "none"}`,
  ].join("\n");

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({ model, schema: SystemDesignReviewSchema, system, prompt });
      return { review: object, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`System design review failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}
