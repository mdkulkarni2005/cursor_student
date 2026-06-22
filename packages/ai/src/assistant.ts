import { generateText, streamText, type ModelMessage } from "ai";
import { cachedSystem, logCacheUsage } from "./cache";

const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

export type AssistantRole = "user" | "assistant";
export type AssistantMessage = { role: AssistantRole; content: string };

/** A project the student is actively asking about (stuck-help) — small, highly relevant. */
export type AssistantFocusProject = {
  title: string;
  summary?: string;
  skills?: string[];
  hardwareNote?: string;
  description?: string;
};

/** Grounding context, assembled server-side from the signed-in user (never the client). */
export type AssistantContext = {
  name?: string;
  department?: string;
  semester?: string;
  college?: string;
  plan?: string;
  /** Recent documents — titles/types/status only, no bodies (keeps tokens small). */
  documents?: { title: string; type: string; status: string }[];
  /** Set when the chat was opened from a specific project (stuck-help grounding). */
  focusProject?: AssistantFocusProject;
};

export type AssistantResult = { reply: string; model: string };

function contextLines(ctx: AssistantContext): string {
  const lines: string[] = [];
  if (ctx.name) lines.push(`Student: ${ctx.name}`);
  if (ctx.department) lines.push(`Department: ${ctx.department}`);
  if (ctx.semester) lines.push(`Semester: ${ctx.semester}`);
  if (ctx.college) lines.push(`College: ${ctx.college}`);
  if (ctx.plan) lines.push(`Plan: ${ctx.plan}`);
  if (ctx.documents?.length) {
    lines.push(
      "Recent work:\n" +
        ctx.documents
          .slice(0, 8)
          .map((d) => `  - ${d.title} (${d.type.toLowerCase()}, ${d.status.toLowerCase()})`)
          .join("\n"),
    );
  }
  const p = ctx.focusProject;
  if (p) {
    lines.push(
      "The student is currently working on (and likely asking about) THIS project:\n" +
        [
          `  Title: ${p.title}`,
          p.summary ? `  Summary: ${p.summary}` : "",
          p.skills?.length ? `  Tech/skills: ${p.skills.join(", ")}` : "",
          p.hardwareNote ? `  Hardware: ${p.hardwareNote}` : "",
          p.description ? `  Student's notes: ${p.description}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
    );
  }
  return lines.join("\n");
}

function stubReply(messages: AssistantMessage[], ctx: AssistantContext): string {
  const last = [...messages].reverse().find((m) => m.role === "user")?.content.trim() ?? "";
  const who = ctx.name ? ctx.name.split(" ")[0] : "there";
  const lower = last.toLowerCase();
  if (!last || /^(hi|hey|hello|yo|hii|namaste|hola)\b/.test(lower))
    return `Hi ${who}! I'm your StudentOS assistant. Ask me about reports, PPTs, assignments, or your viva prep.`;
  if (ctx.focusProject && (lower.includes("stuck") || lower.includes("help") || lower.includes("project") || lower.includes("wiring") || lower.includes("circuit") || lower.includes("calcul")))
    return `Let's work through **${ctx.focusProject.title}** together. Tell me exactly where you're stuck — which part (${(ctx.focusProject.skills ?? ["the build"]).slice(0, 3).join(", ")}), what you've tried, and any error or reading you're getting. I'll give you concrete next steps.`;
  if (lower.includes("report"))
    return `For a report, head to **Reports** — you can upload your college's own .docx template and I'll fill it without breaking the format. Want me to outline "${last}"?`;
  if (lower.includes("ppt") || lower.includes("presentation") || lower.includes("slide"))
    return `I can build a deck in **PPT** — upload your college template and I'll match its colors and fonts. Tell me the topic and how many slides.`;
  if (lower.includes("assignment") || lower.includes("solve"))
    return `Snap a photo of the problem in **Assignments** and I'll work through it step by step. What subject is it?`;
  if (lower.includes("viva") || lower.includes("interview"))
    return `Open **Viva** to generate likely questions with model answers for your topic. Which subject's viva are you preparing for?`;
  const ctxNote = ctx.department ? ` Since you're in ${ctx.department}, I'll keep it relevant to your branch.` : "";
  return `Got it — "${last}".${ctxNote} (This is a local preview reply; with the AI Gateway connected I'll give a full answer.)`;
}

/** The grounded system prompt — shared by the streaming and non-streaming paths. */
export function buildAssistantSystem(ctx: AssistantContext): string {
  return [
    "You are StudentOS, an always-on academic assistant for engineering students in India.",
    "Be concise, practical, and encouraging. Use the student's context to tailor answers.",
    "When a task fits a StudentOS tool, point them to it: Reports, PPT, Assignments (photo solver), Viva.",
    "Project stuck-help: when the student is stuck on a project (circuit wiring, a mechanical/structural calculation, a sensor not reading, a build or code bug), give concrete, step-by-step debugging help grounded in their department. Ask what they've tried and what they're observing; suggest the most likely causes first; show formulas/pinouts/values where useful. Be specific, not generic.",
    "If the student attaches a photo (a question, a circuit, a diagram, handwritten work), read it carefully and help with what's in the image.",
    "You cannot perform actions or browse — you advise and draft. Never invent the student's grades or data.",
    "",
    "Student context:",
    contextLines(ctx) || "(no profile context yet)",
  ].join("\n");
}

/** Build provider messages, attaching an image to the LAST user turn when present (vision). */
function toModelMessages(messages: AssistantMessage[], imageDataUrl?: string): ModelMessage[] {
  const out = messages.map((m) => ({ role: m.role, content: m.content }) as ModelMessage);
  if (imageDataUrl) {
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i]!.role === "user") {
        out[i] = {
          role: "user",
          content: [
            { type: "text", text: typeof out[i]!.content === "string" ? (out[i]!.content as string) : "" },
            { type: "image", image: imageDataUrl },
          ],
        };
        break;
      }
    }
  }
  return out;
}

/**
 * Always-on assistant. Free-form chat grounded in the student's own context.
 * stub mirrors the other AI seams so the whole panel works free, locally.
 */
export async function chatAssistant(
  messages: AssistantMessage[],
  ctx: AssistantContext = {},
): Promise<AssistantResult> {
  if (process.env.AI_DRIVER === "stub") {
    return { reply: stubReply(messages, ctx), model: "stub" };
  }

  // System prompt is a cache breakpoint; the conversation history follows uncached.
  const systemMessage = cachedSystem(buildAssistantSystem(ctx));

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { text, providerMetadata } = await generateText({
        model,
        messages: [systemMessage, ...messages.map((m) => ({ role: m.role, content: m.content }) as ModelMessage)],
      });
      logCacheUsage("assistant.chat", providerMetadata);
      return { reply: text, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Assistant failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

/**
 * Streaming variant — returns a plain-text streaming Response and reports the final text via
 * `onFinish` (used to persist the turn). stub streams the canned reply as one chunk so the
 * client's stream-reading code path works identically with no model.
 */
export async function streamAssistant(
  messages: AssistantMessage[],
  ctx: AssistantContext = {},
  opts: { imageDataUrl?: string; onFinish?: (text: string) => void | Promise<void> } = {},
): Promise<Response> {
  if (process.env.AI_DRIVER === "stub") {
    const text = stubReply(messages, ctx);
    await opts.onFinish?.(text);
    return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "x-model": "stub" } });
  }

  // System prompt is a cache breakpoint; history + the (optional) image turn follow uncached.
  const result = streamText({
    model: PRIMARY_MODEL,
    messages: [cachedSystem(buildAssistantSystem(ctx)), ...toModelMessages(messages, opts.imageDataUrl)],
    // A mid-stream provider error ends the stream cleanly instead of throwing unhandled; the client
    // keeps whatever streamed. (Streaming can't fall back mid-flight — non-stream chatAssistant does.)
    onError: ({ error }) => {
      console.warn("[assistant.stream] provider error:", error instanceof Error ? error.message : error);
    },
    onFinish: async ({ text, providerMetadata }) => {
      logCacheUsage("assistant.stream", providerMetadata);
      await opts.onFinish?.(text);
    },
  });
  return result.toTextStreamResponse();
}
