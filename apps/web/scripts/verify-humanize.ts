/**
 * Proves #10: generation stores quality metrics, and the humanizer improves them.
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   pnpm --filter web verify:humanize
 */
import { prisma } from "@studentos/db";
import { humanizeReport } from "../lib/quality.js";
import type { ReportContent } from "@studentos/documents";
import type { QualityMetrics } from "../lib/quality.js";

async function main() {
  const doc = await prisma.document.findFirst({
    where: { type: "REPORT", status: "READY" },
    orderBy: { createdAt: "desc" },
    include: { content: true },
  });
  if (!doc?.content || !doc.quality) {
    console.error("No report with stored quality found — run verify:report first.");
    process.exit(1);
  }

  const before = doc.quality as unknown as QualityMetrics;
  const content = doc.content.data as unknown as ReportContent;
  const { metrics: after } = humanizeReport(content);

  console.log(`  stored at generation : AI ${before.aiScore}%  ·  Plagiarism ${before.plagiarismScore}%  ·  humanized=${before.humanized}`);
  console.log(`  after humanize       : AI ${after.aiScore}%  ·  Plagiarism ${after.plagiarismScore}%  ·  humanized=${after.humanized}`);

  const ok =
    before.aiScore > 0 &&
    before.humanized === false &&
    after.humanized === true &&
    after.aiScore < before.aiScore;
  console.log(ok ? "✓ PASS — quality stored on generation; humanizer lowers the AI score." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
