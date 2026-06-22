import { prisma } from "@studentos/db";
import { getObjectBuffer } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Page-accurate preview: convert the report's generated .docx to PDF so the browser shows
 * EXACT Word pages + a real page count. Conversion runs on a Gotenberg service (LibreOffice in
 * a container) addressed by GOTENBERG_URL — this keeps the heavy binary off Vercel's functions.
 * When GOTENBERG_URL is unset we return 503 and the client falls back to the HTML renderer.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const gotenberg = process.env.GOTENBERG_URL;
  if (!gotenberg) return new Response("PDF rendering not configured", { status: 503 });

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "REPORT" },
    include: { exports: { where: { format: "DOCX" }, take: 1 } },
  });
  const exp = doc?.exports[0];
  if (!doc || !exp) return new Response("Not found", { status: 404 });

  let docx: Buffer;
  try {
    docx = await getObjectBuffer(exp.storageKey);
  } catch {
    return new Response("Source unavailable", { status: 404 });
  }

  const form = new FormData();
  form.append("files", new Blob([new Uint8Array(docx)], { type: DOCX_MIME }), "report.docx");

  let pdf: ArrayBuffer;
  try {
    const res = await fetch(`${gotenberg.replace(/\/$/, "")}/forms/libreoffice/convert`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) return new Response("Conversion failed", { status: 502 });
    pdf = await res.arrayBuffer();
  } catch {
    return new Response("Conversion service unreachable", { status: 502 });
  }

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="report.pdf"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
