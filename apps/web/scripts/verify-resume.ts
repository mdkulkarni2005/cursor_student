/**
 * End-to-end proof of the Resume pillar: generate → store → render (house ATS format)
 * → edit a field + re-render → one-page (tight) re-render. stub AI + local storage.
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:resume
 */
import { existsSync, readFileSync } from "node:fs";
import { prisma } from "@studentos/db";
import { getObjectBuffer } from "@studentos/storage";
import { renderResumePdf, parseResumeDocx } from "@studentos/documents";
import { generateAndStoreResume, getResume, updateResume, setResumeDensity, importResume } from "../lib/resume/generate.js";

const isDocx = (b: Buffer | null) => !!b && b.length > 1000 && b[0] === 0x50 && b[1] === 0x4b;
async function exportBytes(docId: string): Promise<Buffer | null> {
  const exp = await prisma.documentExport.findFirst({ where: { documentId: docId, format: "DOCX" } });
  return exp ? await getObjectBuffer(exp.storageKey) : null;
}

async function main() {
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });
  const user = await prisma.user.upsert({
    where: { clerkId: "local-resume-test" },
    create: {
      clerkId: "local-resume-test", email: "local-resume@studentos.local", name: "Resume Tester",
      department: "Computer Engineering", semester: "7", onboardedAt: new Date(), institutionId: inst.id, plan: "FREE",
    },
    update: { department: "Computer Engineering", institutionId: inst.id },
  });

  // 1) Generate
  const { docId } = await generateAndStoreResume({
    userId: user.id,
    contact: { phone: "+91 90000 00000", location: "Dhule, MH", linkedin: "linkedin.com/in/test" },
    targetRole: "Backend Engineer",
    rawNotes: "Built a hyperlocal jobs app with Next.js and Convex serving 200 users. Know TypeScript, Node, Docker.",
  });
  const gen = await getResume(user.id, docId);
  const b1 = await exportBytes(docId);
  console.log(`  generate → status check, validDocx:${isDocx(b1)} sections: skills=${gen?.resume.skills.length} projects=${gen?.resume.projects.length}`);

  // 2) Edit a field (summary) and re-render — format must survive
  const edited = { ...gen!.resume, summary: "Edited summary line — backend-focused engineer." };
  await updateResume(user.id, docId, edited);
  const afterEdit = await getResume(user.id, docId);
  const b2 = await exportBytes(docId);
  const editApplied = afterEdit?.resume.summary?.startsWith("Edited summary line");
  console.log(`  edit-a-line → applied:${editApplied} validDocx:${isDocx(b2)}`);

  // 3) One-page (tight) re-render
  await setResumeDensity(user.id, docId, "tight");
  const afterTight = await getResume(user.id, docId);
  const b3 = await exportBytes(docId);
  console.log(`  one-page → density:${afterTight?.meta.density} validDocx:${isDocx(b3)}`);

  // 4) ATS score present + sensible
  const ats = afterTight?.meta.ats;
  console.log(`  ats → score:${ats?.score} coverage:${ats?.keywordCoverage}% matched:${ats?.matched.length} suggestions:${ats?.suggestions.length}`);

  // 5) PDF export (same renderer the download route uses)
  const { buffer: pdf } = await renderResumePdf(afterTight!.resume, "normal");
  const isPdf = pdf.length > 800 && pdf.slice(0, 5).toString() === "%PDF-";
  console.log(`  pdf → ${pdf.length}b validPdf:${isPdf}`);

  // 6) Import (deterministic parse) — uses the real .docx if present, else a synthetic one is skipped.
  let importOk = true;
  const samplePath = "/tmp/manas_resume.docx";
  if (existsSync(samplePath)) {
    const parsed = parseResumeDocx(readFileSync(samplePath));
    const imp = await importResume(user.id, parsed);
    const impDoc = await prisma.document.findUnique({ where: { id: imp.docId }, include: { content: true } });
    const impBytes = await exportBytes(imp.docId);
    importOk = impDoc?.status === "READY" && isDocx(impBytes) && parsed.skills.length >= 3 && parsed.projects.length >= 1 && !!parsed.contact.email;
    console.log(`  import → parsed name:${parsed.contact.name} skills:${parsed.skills.length} exp:${parsed.experience.length} proj:${parsed.projects.length} validDocx:${isDocx(impBytes)}`);
  } else {
    console.log("  import → (skipped: /tmp/manas_resume.docx not present)");
  }

  const doc = await prisma.document.findUnique({ where: { id: docId } });
  const ok =
    doc?.status === "READY" && isDocx(b1) && isDocx(b2) && isDocx(b3) && !!editApplied &&
    afterTight?.meta.density === "tight" && typeof ats?.score === "number" && ats.score >= 0 && ats.score <= 100 && isPdf && importOk;
  console.log(ok ? "✓ PASS — resume generated, persisted as editable data, edited + one-page re-rendered." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
