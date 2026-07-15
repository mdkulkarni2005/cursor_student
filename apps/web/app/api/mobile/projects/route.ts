import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { ProjectIdeaSchema, type ProjectIdea } from "@studentos/ai";
import { getOrCreateUser } from "@/lib/user";
import { finalizeProject } from "@/lib/projects/generate";

/** Finalize a chosen idea into a persisted PROJECT. */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: { idea?: unknown; description?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let idea: ProjectIdea;
  try {
    idea = ProjectIdeaSchema.parse(body.idea);
  } catch {
    return NextResponse.json({ error: "Invalid project idea." }, { status: 400 });
  }

  const { docId } = await finalizeProject(user.id, idea, body.description?.trim() || undefined);
  return NextResponse.json({ docId }, { status: 201 });
}

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const docs = await prisma.document.findMany({
    where: { ownerId: user.id, type: "PROJECT" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, status: true, createdAt: true, updatedAt: true },
    take: 100,
  });
  return NextResponse.json({ projects: docs });
}
