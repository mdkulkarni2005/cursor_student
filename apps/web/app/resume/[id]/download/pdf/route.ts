import { renderResumePdf, type Resume, type ResumeDensity } from "@studentos/documents";
import { prisma } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";

export const runtime = "nodejs";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "resume";
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "RESUME" },
    include: { content: true },
  });
  if (!doc?.content) return new Response("Not found", { status: 404 });

  const resume = doc.content.data as unknown as Resume;
  const density = ((doc.quality as { density?: ResumeDensity } | null)?.density) ?? "normal";
  const { buffer } = await renderResumePdf(resume, density);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugify(doc.title)}.pdf"`,
      "Content-Length": String(buffer.length),
    },
  });
}
