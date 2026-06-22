import { prisma } from "@studentos/db";
import { getObjectBuffer } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "report";
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "REPORT" },
    include: { exports: { where: { format: "DOCX" }, take: 1 } },
  });
  const exp = doc?.exports[0];
  if (!doc || !exp) return new Response("Not found", { status: 404 });

  const buffer = await getObjectBuffer(exp.storageKey);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": DOCX_MIME,
      "Content-Disposition": `attachment; filename="${slugify(doc.title)}.docx"`,
      "Content-Length": String(buffer.length),
    },
  });
}
