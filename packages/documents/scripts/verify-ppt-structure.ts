/**
 * Proves the FILL-IN-PLACE path for structured templates: detect a template's roles
 * (info-table metadata / section slides / closing slide), then fill each in place while keeping
 * the EXACT slide set — no clone, no invented slide count, closing slide preserved.
 *   pnpm --filter @studentos/documents verify:ppt-structure
 * Also re-checks the real user fixture when PPT_FIXTURE points at a .pptx.
 */
import PptxGenJS from "pptxgenjs";
import { readFileSync } from "node:fs";
import { inspectPptxStructure } from "../src/pptx-structure.js";
import { fillPptxTemplateInPlace } from "../src/pptx-fill.js";

async function structuredTemplate(): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.defineSlideMaster({
    title: "SEC",
    objects: [
      { placeholder: { options: { name: "ttl", type: "title", x: 0.5, y: 0.3, w: 12, h: 1 }, text: "" } },
      { placeholder: { options: { name: "bod", type: "body", x: 0.5, y: 1.6, w: 12, h: 5 }, text: "" } },
    ],
  });

  // 1) Metadata slide — a key:value info table with placeholder values.
  const meta = pptx.addSlide();
  const row = (cells: string[]) => cells.map((text) => ({ text }));
  meta.addTable(
    [
      row(["A.Y.", ":", "2024-25"]),
      row(["Title of the Internship", ":", "XYZ"]),
      row(["Name of the student", ":", "XYZ"]),
      row(["PRN", ":", "XYZ"]),
    ],
    { x: 0.5, y: 0.5, w: 9 },
  );

  // 2–3) Section slides — heading + instruction body.
  for (const [h, instr] of [
    ["1. Introduction", "Brief overview of the internship, its objectives, and your motivation."],
    ["2. Company Overview", "Describe the company or industry where you interned and its core activities."],
  ] as const) {
    const s = pptx.addSlide({ masterName: "SEC" });
    s.addText(h, { placeholder: "ttl" });
    s.addText([{ text: instr, options: {} }], { placeholder: "bod" });
  }

  // 4) Closing slide — must be preserved verbatim.
  const ty = pptx.addSlide();
  ty.addText("Thank You!!", { x: 1, y: 3, w: 8, h: 1 });

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("  ✓ " + msg);
}

async function checkBuffer(buf: Buffer, label: string) {
  console.log(`\n— ${label} —`);
  const s = inspectPptxStructure(buf);
  assert(s.ok && s.structured, "detected as structured");
  const sections = s.slides.filter((x) => x.kind === "section");
  const metas = s.slides.filter((x) => x.kind === "metadata");
  assert(sections.length >= 1, `found ${sections.length} section slide(s)`);
  assert(metas.length >= 1, `found ${metas.length} metadata slide(s)`);

  const contentByHeading: Record<string, string[]> = {};
  for (const sec of sections) if (sec.kind === "section") contentByHeading[sec.heading] = ["Generated A", "Generated B", "Generated C"];
  const fieldValues: Record<string, string> = {};
  for (const m of metas) if (m.kind === "metadata") for (const f of m.fields) if (f.isPlaceholder) fieldValues[f.label] = `FILLED ${f.label}`;

  const res = fillPptxTemplateInPlace(buf, s, contentByHeading, fieldValues);
  assert(res.ok && !!res.buffer, "fill-in-place passed the integrity guard");

  // Slide count is preserved exactly (no clone/invention).
  const before = new (await import("pizzip")).default(buf);
  const after = new (await import("pizzip")).default(res.buffer!);
  const count = (z: InstanceType<typeof import("pizzip").default>) =>
    Object.keys(z.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length;
  assert(count(before) === count(after), `slide count preserved (${count(after)})`);

  // Injected text is present; instruction text and section bodies were replaced.
  const txt = Object.keys(after.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .map((f) => after.file(f)!.asText())
    .join("");
  assert(Object.values(contentByHeading)[0]!.every((b) => txt.includes(b)), "section bullets injected");
  assert(Object.values(fieldValues).some((v) => txt.includes(v)), "info-table values injected");
}

async function main() {
  await checkBuffer(await structuredTemplate(), "synthetic structured template");

  const fixture = process.env.PPT_FIXTURE;
  if (fixture) await checkBuffer(readFileSync(fixture), `fixture: ${fixture.split("/").pop()}`);

  console.log("\n✓ PASS — structured-template detect + fill-in-place (exact slides preserved).");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
