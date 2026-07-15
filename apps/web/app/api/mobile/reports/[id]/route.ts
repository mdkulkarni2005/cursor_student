import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";

/** Poll target for progress + the final content, mirroring what the web report page reads. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "REPORT" },
    include: { content: true, job: true },
  });
  if (!doc) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  return NextResponse.json({
    id: doc.id,
    title: doc.title,
    status: doc.status,
    quality: doc.quality,
    content: doc.content?.data ?? null,
    stage: doc.status === "GENERATING" ? ((doc.job?.pending as { stage?: string } | null)?.stage ?? null) : null,
    questions: doc.status === "NEEDS_INPUT" ? ((doc.job?.pending as { questions?: unknown } | null)?.questions ?? []) : null,
    error: doc.status === "FAILED" ? doc.job?.error ?? null : null,
    updatedAt: doc.updatedAt,
  });
}
