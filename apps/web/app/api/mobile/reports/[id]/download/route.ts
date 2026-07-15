import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { signedDownloadUrl } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";

/**
 * Returns a short-lived presigned R2 URL instead of streaming the file through this route —
 * mobile can fetch/open it directly over plain HTTPS, no Node-only code needed on the client.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "REPORT" },
    include: { exports: { where: { format: "DOCX" }, take: 1 } },
  });
  const exp = doc?.exports[0];
  if (!doc || !exp) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  const url = await signedDownloadUrl(exp.storageKey);
  return NextResponse.json({ url, expiresInSeconds: 300 });
}
