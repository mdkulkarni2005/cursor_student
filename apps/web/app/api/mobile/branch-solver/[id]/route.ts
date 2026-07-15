import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "BRANCH_SOLVER" },
    include: { content: true, job: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({
    id: doc.id,
    title: doc.title,
    feature: doc.feature,
    status: doc.status,
    content: doc.content?.data ?? null,
    stage: doc.status === "GENERATING" ? ((doc.job?.pending as { stage?: string } | null)?.stage ?? null) : null,
    error: doc.status === "FAILED" ? doc.job?.error ?? null : null,
  });
}
