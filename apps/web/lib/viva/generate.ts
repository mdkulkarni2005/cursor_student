import { prisma } from "@studentos/db";
import { generateVivaQuestions, withAiRetry } from "@studentos/ai";

type AnyContent = Record<string, unknown>;

/** Flatten a document's structured content into plain text the viva model can read. */
function serializeContext(type: string, data: AnyContent): string {
  if (type === "REPORT") {
    const sections = (data.sections as { heading: string; content: string }[] | undefined) ?? [];
    return [data.abstract, ...sections.map((s) => `${s.heading}: ${s.content}`)].filter(Boolean).join("\n");
  }
  if (type === "PPT") {
    const slides = (data.slides as { heading: string; bullets: string[] }[] | undefined) ?? [];
    return slides.map((s) => `${s.heading}: ${(s.bullets ?? []).join("; ")}`).join("\n");
  }
  if (type === "ASSIGNMENT") {
    const steps = (data.steps as { heading: string; detail: string }[] | undefined) ?? [];
    return [data.questionSummary, data.approach, ...steps.map((s) => `${s.heading}: ${s.detail}`), data.finalAnswer]
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

/** Generates and stores a viva question set for an existing document. Returns the source doc id. */
export async function generateAndStoreViva(userId: string, sourceDocId: string): Promise<string> {
  const doc = await prisma.document.findFirst({
    where: { id: sourceDocId, ownerId: userId },
    include: { content: true, owner: true },
  });
  if (!doc) throw new Error("Document not found.");
  if (!doc.content) throw new Error("This document has no content to prepare viva from.");

  const context = serializeContext(doc.type, doc.content.data as AnyContent);
  const { content } = await withAiRetry(() => generateVivaQuestions({
    title: doc.title,
    sourceType: doc.type.toLowerCase(),
    context,
    department: doc.owner.department ?? undefined,
  }), { label: "viva.generate" });

  await prisma.vivaSet.upsert({
    where: { documentId: doc.id },
    create: { documentId: doc.id, questions: content.questions as unknown as object },
    update: { questions: content.questions as unknown as object },
  });

  return doc.id;
}
