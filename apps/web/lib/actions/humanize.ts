"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@studentos/db";
import { getObjectBuffer, putObject, keys } from "@studentos/storage";
import { renderReportDocx, type ReportContent } from "@studentos/documents";
import { getOrCreateUser } from "@/lib/user";
import { humanizeReport } from "@/lib/quality";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Re-runs the humanizer on a report, re-renders the DOCX, and stores improved metrics. */
export async function humanizeReportAction(formData: FormData): Promise<void> {
  const docId = String(formData.get("docId") ?? "");
  const user = await getOrCreateUser();
  if (!user) return;

  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: user.id, type: "REPORT" },
    include: { content: true, template: true },
  });
  if (!doc || !doc.content || !doc.template) return;

  const original = doc.content.data as unknown as ReportContent;
  const { content: humanized, metrics } = humanizeReport(original);

  const templateBuffer = await getObjectBuffer(doc.template.storageKey);
  const { buffer } = renderReportDocx(humanized, templateBuffer);
  const exportKey = keys.exportFile(doc.id, "DOCX");
  await putObject(exportKey, buffer, DOCX_MIME);

  await prisma.$transaction([
    prisma.documentContent.update({
      where: { documentId: doc.id },
      data: { data: humanized as unknown as object },
    }),
    prisma.document.update({ where: { id: doc.id }, data: { quality: metrics } }),
    prisma.documentExport.updateMany({
      where: { documentId: doc.id, format: "DOCX" },
      data: { storageKey: exportKey, sizeBytes: buffer.length },
    }),
  ]);

  revalidatePath(`/reports/${doc.id}`);
}
