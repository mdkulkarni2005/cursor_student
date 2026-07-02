import { prisma } from "@studentos/db";
import { getObjectBuffer } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";
import type { ReportContent } from "@studentos/documents";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; sectionIndex: string }> }) {
  const { id, sectionIndex: rawIndex } = await params;
  const user = await getOrCreateUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "REPORT" },
    include: { content: true },
  });
  if (!doc?.content) return new Response("Not found", { status: 404 });

  const index = Number(rawIndex);
  const content = doc.content.data as Partial<ReportContent>;
  const key = content.sections?.[index]?.image;
  if (!key) return new Response("Not found", { status: 404 });

  const buffer = await getObjectBuffer(key);
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png", "Content-Length": String(buffer.length), "Cache-Control": "no-store" },
  });
}
