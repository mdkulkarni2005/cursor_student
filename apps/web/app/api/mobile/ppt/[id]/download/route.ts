import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { signedDownloadUrl } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";

/**
 * Presigned URL, not a streamed download — the web download route relies on the browser's
 * Clerk session cookie, which the mobile app doesn't have when opening a system browser tab.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "PPT" },
    include: { exports: { where: { format: "PPTX" }, take: 1 } },
  });
  const exp = doc?.exports[0];
  if (!doc || !exp) return NextResponse.json({ error: "Presentation not found." }, { status: 404 });

  const url = await signedDownloadUrl(exp.storageKey);
  return NextResponse.json({ url, expiresInSeconds: 300 });
}
