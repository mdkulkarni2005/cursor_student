/**
 * End-to-end proof of the Viva pillar — generates a question set from an existing document.
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   AI_DRIVER=stub pnpm --filter web verify:viva
 */
import { prisma } from "@studentos/db";
import { generateAndStoreViva } from "../lib/viva/generate.js";

type VivaQ = { question: string; answer: string; difficulty: string };

async function main() {
  const src = await prisma.document.findFirst({
    where: { type: "REPORT", status: "READY", content: { isNot: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!src) {
    console.error("No source report found — run verify:report first.");
    process.exit(1);
  }

  const docId = await generateAndStoreViva(src.ownerId, src.id);
  const viva = await prisma.vivaSet.findUnique({ where: { documentId: docId } });
  const qs = (viva?.questions as VivaQ[] | undefined) ?? [];

  console.log(`  source: "${src.title.slice(0, 44)}"  |  questions: ${qs.length}`);
  if (qs[0]) console.log(`  e.g. Q1 (${qs[0].difficulty}): ${qs[0].question}`);

  const ok = qs.length >= 4 && qs.every((q) => q.question && q.answer && q.difficulty);
  console.log(ok ? "✓ PASS — viva set generated from a source document." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
