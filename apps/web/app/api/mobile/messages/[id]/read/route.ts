import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";

/** Marks a recruiter message as read. Scoped to the signed-in student — mirrors lib/actions/messages.ts markMessageRead. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  await prisma.recruiterMessage.updateMany({
    where: { id, studentId: user.id },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
