/**
 * End-to-end proof of the PPT pillar — produces a real .pptx (stub AI + local storage).
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:ppt
 */
import { prisma } from "@studentos/db";
import { getObjectBuffer } from "@studentos/storage";
import { renderPptx } from "@studentos/documents";
import { generateAndStorePpt } from "../lib/ppt/generate.js";

const TEST_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function main() {
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });
  const user = await prisma.user.upsert({
    where: { clerkId: "local-ppt-test" },
    create: {
      clerkId: "local-ppt-test",
      email: "local-ppt@studentos.local",
      name: "PPT Tester",
      department: "Electrical Engineering",
      semester: "5",
      onboardedAt: new Date(),
      institutionId: inst.id,
      plan: "PRO",
    },
    update: { plan: "PRO", department: "Electrical Engineering", semester: "5", institutionId: inst.id },
  });

  const { docId } = await generateAndStorePpt({
    userId: user.id,
    title: "Smart Energy Meter using IoT",
    slideCount: 8,
    guidelines: "Cover ESP32-based metering with cloud dashboards and tamper detection.",
  });

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: { exports: true, content: true, job: true },
  });
  const exp = doc?.exports[0];
  const bytes = exp ? await getObjectBuffer(exp.storageKey) : null;
  const isPptx = !!bytes && bytes.length > 1000 && bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
  const slides = ((doc?.content?.data as { slides?: unknown[] } | undefined)?.slides ?? []).length;

  console.log(`  status:${doc?.status} | job:${doc?.job?.status} | model:${doc?.job?.model}`);
  console.log(`  export:${exp?.storageKey} (${exp?.sizeBytes} b) | slides:${slides} | valid .pptx:${isPptx}`);

  // Image embedding: a slide with an image must produce a media entry in the .pptx zip.
  const withImage = await renderPptx(
    { title: "Img Test", subtitle: "x", slides: [
      { heading: "A", bullets: ["one", "two", "three"] },
      { heading: "B", bullets: ["one", "two", "three"] },
      { heading: "C", bullets: ["one", "two", "three"] },
    ] },
    undefined,
    [TEST_PNG, null, null],
  );
  const hasMedia = withImage.buffer.includes(Buffer.from("ppt/media/image"));
  console.log(`  image embed → media entry present:${hasMedia}`);

  const ok = doc?.status === "READY" && isPptx && slides >= 3 && hasMedia;
  console.log(ok ? "✓ PASS — PPT pipeline produced a real .pptx (with image embedding)." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
