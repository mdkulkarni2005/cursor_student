import { prisma } from "@studentos/db";
import { getObjectBuffer } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";
import type { ProjectContent } from "@/lib/projects/generate";

/** Serve a generated project build-plan image (owner-scoped). The key lives on content.breakdown.images. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; idx: string }> },
) {
  const { id, idx } = await params;
  const user = await getOrCreateUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const imgIndex = parseInt(idx, 10);
  if (!Number.isInteger(imgIndex) || imgIndex < 0) return new Response("Bad request", { status: 400 });

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "PROJECT" },
    include: { content: true },
  });
  if (!doc?.content) return new Response("Not found", { status: 404 });

  const data = doc.content.data as unknown as ProjectContent;
  const key = data.breakdown?.images?.[imgIndex]?.key;
  if (!key) return new Response("Not found", { status: 404 });

  let buffer: Buffer;
  try {
    buffer = await getObjectBuffer(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=300",
    },
  });
}
