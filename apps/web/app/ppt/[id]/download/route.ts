import { prisma } from "@studentos/db";
import { getObjectBuffer } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";

const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "presentation";
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "PPT" },
    include: { exports: { where: { format: "PPTX" }, take: 1 } },
  });
  const exp = doc?.exports[0];
  if (!doc || !exp) return new Response("Not found", { status: 404 });

  const buffer = await getObjectBuffer(exp.storageKey);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": PPTX_MIME,
      "Content-Disposition": `attachment; filename="${slugify(doc.title)}.pptx"`,
      "Content-Length": String(buffer.length),
    },
  });
}
