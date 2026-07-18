import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { PptContentSchema } from "@studentos/documents";
import { getOrCreateUser } from "@/lib/user";
import { rerenderPptExport } from "@/lib/ppt/generate";
import { rateLimit, friendlyError } from "@/lib/reliability";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "PPT" },
    include: { content: true, job: true },
  });
  if (!doc) return NextResponse.json({ error: "Presentation not found." }, { status: 404 });

  return NextResponse.json({
    id: doc.id,
    title: doc.title,
    status: doc.status,
    content: doc.content?.data ?? null,
    stage: doc.status === "GENERATING" ? ((doc.job?.pending as { stage?: string } | null)?.stage ?? null) : null,
    questions: doc.status === "NEEDS_INPUT" ? ((doc.job?.pending as { questions?: unknown } | null)?.questions ?? []) : null,
    error: doc.status === "FAILED" ? doc.job?.error ?? null : null,
    updatedAt: doc.updatedAt,
  });
}

/**
 * Basic text-only edit from the mobile app: heading/bullets/notes per slide, plus title/subtitle.
 * Layout, tables, diagrams, stats, columns, quotes and images are left untouched — mobile only
 * ever sends back the same slide shape it received with those fields unmodified.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: docId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    await rateLimit(user.id, "ppt");
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 429 });
  }

  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: user.id, type: "PPT" },
    include: { content: true },
  });
  if (!doc) return NextResponse.json({ error: "Presentation not found." }, { status: 404 });
  if ((doc.content?.data as { templated?: boolean } | undefined)?.templated) {
    return NextResponse.json({ error: "This deck follows your uploaded template — download it to edit in PowerPoint." }, { status: 409 });
  }

  let rawContent: unknown;
  try {
    rawContent = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = PptContentSchema.safeParse(rawContent);
  if (!parsed.success) return NextResponse.json({ error: "Some slides are incomplete — please fill them in before saving." }, { status: 400 });

  try {
    await rerenderPptExport(docId, parsed.data);
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
