import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { streamAssistant, type AssistantMessage, type AssistantFocusProject } from "@studentos/ai";
import { getOrCreateUser } from "@/lib/user";
import { getThread, appendTurn } from "@/lib/assistant/thread";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { assertWithinCostBudget } from "@/lib/entitlements";
import type { ProjectContent } from "@/lib/projects/generate";

const PLAN_LABEL: Record<string, string> = { FREE: "Free", PRO: "Pro", PREMIUM: "Premium" };
const MAX_MESSAGES = 20;

/** GET — load the persisted chat thread when the panel opens. */
export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ messages: [] });
  return NextResponse.json({ messages: await getThread(user.id) });
}

function sanitize(input: unknown): AssistantMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((m): m is { role: string; content: string } =>
      !!m && typeof m === "object" && typeof (m as { content?: unknown }).content === "string")
    .map((m): AssistantMessage => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content).slice(0, 4000),
    }))
    .filter((m) => m.content.trim().length > 0)
    .slice(-MAX_MESSAGES);
}

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to chat." }, { status: 401 });

  // Anti-drain: cap assistant messages per user per minute.
  try {
    await rateLimit(user.id, "assistant", 30);
    await assertWithinCostBudget(user);
  } catch (e) {
    const retryAfter = e instanceof RateLimitError ? Math.ceil(e.retryAfterMs / 1000) : 30;
    return NextResponse.json({ error: friendlyError(e) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const messages = sanitize((body as { messages?: unknown })?.messages);
  if (messages.length === 0) return NextResponse.json({ error: "Say something first." }, { status: 400 });
  const focusProjectId = String((body as { focusProjectId?: unknown })?.focusProjectId ?? "") || null;
  // Optional attached photo (data URL) for vision. Cap size to avoid huge payloads.
  const rawImage = String((body as { image?: unknown })?.image ?? "");
  const imageDataUrl = /^data:image\/(png|jpe?g|webp|gif);base64,/.test(rawImage) && rawImage.length < 8_000_000 ? rawImage : undefined;

  // Grounding: fetch fresh from the DB under the signed-in identity — never trust the client.
  const [institution, documents, focusDoc] = await Promise.all([
    user.institutionId
      ? prisma.institution.findUnique({ where: { id: user.institutionId }, select: { name: true } })
      : Promise.resolve(null),
    prisma.document.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { title: true, type: true, status: true },
    }),
    // Stuck-help: if the chat was opened from a project, pull that project's details.
    focusProjectId
      ? prisma.document.findFirst({
          where: { id: focusProjectId, ownerId: user.id, type: "PROJECT" },
          include: { content: true },
        })
      : Promise.resolve(null),
  ]);

  let focusProject: AssistantFocusProject | undefined;
  if (focusDoc?.content) {
    const c = focusDoc.content.data as unknown as ProjectContent;
    focusProject = {
      title: c.idea?.title ?? focusDoc.title,
      summary: c.idea?.summary,
      skills: c.idea?.skills,
      hardwareNote: c.idea?.hardwareNote,
      description: c.description,
    };
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userTurn: AssistantMessage = {
    role: "user",
    content: imageDataUrl ? `${lastUser?.content ?? ""} [photo attached]`.trim() : (lastUser?.content ?? ""),
  };

  try {
    // Streams plain text to the client; persists the exchange when the stream finishes.
    return await streamAssistant(
      messages,
      {
        name: user.name ?? undefined,
        department: user.department ?? undefined,
        semester: user.semester ?? undefined,
        college: institution?.name ?? undefined,
        plan: PLAN_LABEL[user.plan] ?? "Free",
        documents,
        focusProject,
      },
      {
        imageDataUrl,
        onFinish: (text) => appendTurn(user.id, userTurn, text),
      },
    );
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 502 });
  }
}
