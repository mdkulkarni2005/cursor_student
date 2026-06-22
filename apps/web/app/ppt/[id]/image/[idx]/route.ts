import { prisma } from "@studentos/db";
import { getObjectBuffer } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";

/** Serve a generated slide image (owner-scoped). The image key lives on the slide in content.data. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; idx: string }> },
) {
  const { id, idx } = await params;
  const user = await getOrCreateUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const slideIndex = parseInt(idx, 10);
  if (!Number.isInteger(slideIndex) || slideIndex < 0) return new Response("Bad request", { status: 400 });

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "PPT" },
    include: { content: true },
  });
  if (!doc?.content) return new Response("Not found", { status: 404 });

  const data = doc.content.data as { slides?: { image?: string }[] };
  const key = data.slides?.[slideIndex]?.image;
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
