import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";

/** Every document the student owns, across all types — the mobile Vault/home-recents screen. */
export async function GET(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const type = new URL(req.url).searchParams.get("type") || undefined;

  const docs = await prisma.document.findMany({
    where: { ownerId: user.id, ...(type ? { type: type as never } : {}) },
    orderBy: { updatedAt: "desc" },
    select: { id: true, type: true, title: true, status: true, feature: true, createdAt: true, updatedAt: true },
    take: 200,
  });
  return NextResponse.json({ documents: docs });
}
