import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";

/** Title search over the student's own documents — substring match, not full-text/fuzzy. */
export async function GET(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ documents: [] });

  const docs = await prisma.document.findMany({
    where: { ownerId: user.id, title: { contains: q, mode: "insensitive" } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, type: true, title: true, status: true, feature: true, createdAt: true, updatedAt: true },
    take: 40,
  });
  return NextResponse.json({ documents: docs });
}
