import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { getResume, updateResume } from "@/lib/resume/generate";
import { getOrCreateUser } from "@/lib/user";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const doc = await prisma.document.findFirst({ where: { id, ownerId: user.id, type: "RESUME" }, include: { job: true } });
  if (!doc) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  const resolved = doc.status === "READY" ? await getResume(user.id, id) : null;
  return NextResponse.json({
    id: doc.id,
    title: doc.title,
    status: doc.status,
    resume: resolved?.resume ?? null,
    meta: resolved?.meta ?? null,
    error: doc.status === "FAILED" ? doc.job?.error ?? null : null,
  });
}

/** Save in-browser edits (mobile resume editor) — re-renders, format never breaks. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: { resume?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.resume) return NextResponse.json({ error: "Missing resume data." }, { status: 400 });

  try {
    await updateResume(user.id, id, body.resume as Parameters<typeof updateResume>[2]);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
