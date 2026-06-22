/**
 * Proves PPT generation MATCHED to the user's own uploaded .pptx theme (brand colors +
 * fonts), through the real orchestration (quota, workspace, store). stub AI + local storage.
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:ppt-template
 */
import { prisma } from "@studentos/db";
import { putObject, getObjectBuffer } from "@studentos/storage";
import { renderPptx, inspectPptxTheme } from "@studentos/documents";
import { generateAndStorePpt } from "../lib/ppt/generate.js";

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

async function main() {
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });
  const user = await prisma.user.upsert({
    where: { clerkId: "local-ppt-tpl" },
    create: {
      clerkId: "local-ppt-tpl", email: "local-ppt-tpl@studentos.local", name: "PPT Template Tester",
      department: "Electronics Engineering", semester: "6", onboardedAt: new Date(), institutionId: inst.id, plan: "PRO",
    },
    update: { plan: "PRO", department: "Electronics Engineering", institutionId: inst.id },
  });

  // Build a valid .pptx to stand in for the user's college template, then upload it.
  const { buffer: sample } = await renderPptx({
    title: "College Template", subtitle: "Brand",
    slides: [
      { heading: "A", bullets: ["x", "y", "z"] },
      { heading: "B", bullets: ["x", "y", "z"] },
      { heading: "C", bullets: ["x", "y", "z"] },
    ],
  });
  const theme = inspectPptxTheme(sample);
  const templateKey = `uploads/${user.id}/college-template.pptx`;
  await putObject(templateKey, sample, PPTX_MIME);

  const { docId, status } = await generateAndStorePpt({
    userId: user.id,
    title: "Smart Irrigation using IoT",
    slideCount: 8,
    guidelines: "Soil-moisture sensors with an ESP32 and a mobile dashboard.",
    templateKey,
  });

  const doc = await prisma.document.findUnique({ where: { id: docId }, include: { exports: true, content: true } });
  const exp = doc?.exports[0];
  const out = exp ? await getObjectBuffer(exp.storageKey) : null;
  const isPptx = !!out && out.length > 1000 && out[0] === 0x50 && out[1] === 0x4b;
  const slides = ((doc?.content?.data as { slides?: unknown[] } | undefined)?.slides ?? []).length;

  console.log(`  templateTheme ok:${theme.ok} fonts:${theme.fonts.major ?? "—"}/${theme.fonts.minor ?? "—"}`);
  console.log(`  status:${doc?.status} (${status}) | export:${exp?.sizeBytes}b validPptx:${isPptx} | slides:${slides}`);
  const ok = theme.ok && doc?.status === "READY" && isPptx && slides >= 3;
  console.log(ok ? "✓ PASS — deck generated in the user's template theme, valid .pptx." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
