/**
 * DANGER: empties ALL application data (users, documents, attempts, templates, …) for a fresh
 * test. Schema/migrations are untouched. Re-seed the default report template afterwards:
 *   pnpm --filter web seed:templates
 *
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local pnpm --filter web reset:db
 */
import { rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { prisma } from "@studentos/db";

async function main() {
  const before = {
    users: await prisma.user.count(),
    documents: await prisma.document.count(),
    templates: await prisma.template.count(),
    institutions: await prisma.institution.count(),
    dsaAttempts: await prisma.dsaAttempt.count(),
  };
  console.log("Before:", before);

  // Delete in dependency-safe order (most have onDelete: Cascade, but explicit is clearest).
  await prisma.dsaAttempt.deleteMany();
  await prisma.assistantThread.deleteMany();
  await prisma.usageEvent.deleteMany();
  await prisma.documentExport.deleteMany();
  await prisma.documentContent.deleteMany();
  await prisma.generationJob.deleteMany();
  await prisma.vivaSet.deleteMany();
  await prisma.document.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.upload.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.template.deleteMany();
  await prisma.user.deleteMany();
  await prisma.institution.deleteMany();

  const after = {
    users: await prisma.user.count(),
    documents: await prisma.document.count(),
    templates: await prisma.template.count(),
    institutions: await prisma.institution.count(),
  };
  console.log("After:", after);

  // Clear local storage files (.storage) if present — harmless if absent / using R2.
  const dir = resolve(process.env.LOCAL_STORAGE_DIR ?? join(process.cwd(), ".storage"));
  await rm(dir, { recursive: true, force: true }).catch(() => {});
  console.log(`Cleared local storage dir: ${dir}`);

  console.log("✓ Database emptied. Run `pnpm --filter web seed:templates` to restore the default report template.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
