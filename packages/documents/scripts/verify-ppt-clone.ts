/**
 * Proves EXACT layout cloning (#8.1): clone a placeholder-based template, swap text, and pass
 * the integrity guard — plus graceful fallback (returns ok:false) for a template with no
 * usable placeholders. NOTE: "opens cleanly in PowerPoint" is the user's desktop check; this
 * proves referential integrity (the silent-corruption class), not visual rendering.
 *   pnpm --filter @studentos/documents verify:ppt-clone
 */
import PptxGenJS from "pptxgenjs";
import PizZip from "pizzip";
import { fillPptxTemplate, checkPptxIntegrity } from "../src/pptx-clone.js";

async function placeholderTemplate(): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.defineSlideMaster({
    title: "TB",
    background: { color: "F4F0FF" },
    objects: [
      { placeholder: { options: { name: "ttl", type: "title", x: 0.5, y: 0.3, w: 12, h: 1 }, text: "" } },
      { placeholder: { options: { name: "bod", type: "body", x: 0.5, y: 1.6, w: 12, h: 5 }, text: "" } },
    ],
  });
  const s = pptx.addSlide({ masterName: "TB" });
  s.addText("Sample Title", { placeholder: "ttl" });
  s.addText([{ text: "Original bullet one", options: { bullet: true } }], { placeholder: "bod" });
  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}

async function plainTemplate(): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const s = pptx.addSlide();
  s.addText("No placeholders here", { x: 1, y: 1, w: 8, h: 1 });
  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}

const content = {
  title: "Smart Irrigation using IoT",
  subtitle: "Asha Rao · Computer Engineering",
  slides: [
    { heading: "Introduction", bullets: ["Water scarcity is rising", "IoT enables precise control", "Project objective"] },
    { heading: "System Design", bullets: ["Soil-moisture sensors", "ESP32 controller", "Cloud dashboard"] },
    { heading: "Results", bullets: ["20% water saved", "Real-time alerts"] },
  ],
};

let failed = 0;
const check = (name: string, cond: boolean) => { console.log(`  ${cond ? "✓" : "✗"} ${name}`); if (!cond) failed++; };

async function main() {
  // 1) Clone success on a placeholder template.
  const tpl = await placeholderTemplate();
  const res = fillPptxTemplate(tpl, content);
  check("clone ok", res.ok);
  if (!res.ok) console.log("    issues:", res.issues);
  const buf = res.buffer;
  check("valid pptx (PK)", !!buf && buf[0] === 0x50 && buf[1] === 0x4b);

  if (buf) {
    const zip = new PizZip(buf);
    const referenced = Object.keys(zip.files).filter((f) => /ppt\/slides\/slide\d+\.xml$/.test(f));
    // sldIdLst should reference exactly title + 3 content = 4 slides.
    const pres = zip.file("ppt/presentation.xml")!.asText();
    const sldIds = (pres.match(/<p:sldId\b/g) || []).length;
    check("sldIdLst has 4 slides (title + 3)", sldIds === 4);
    check("slide parts written", referenced.length >= 4);

    const guard = checkPptxIntegrity(buf, [content.title, ...content.slides.map((s) => s.heading)]);
    check("integrity guard passes", guard.ok);
    if (!guard.ok) console.log("    guard issues:", guard.issues);

    // Referenced slides carry our text, not the original sample bullet.
    const refText = referenced.map((p) => zip.file(p)!.asText()).join("");
    check("injected heading present", refText.includes("System Design"));
  }

  // 2) Graceful fallback: a plain deck without usable placeholders → ok:false.
  const plain = await plainTemplate();
  const fb = fillPptxTemplate(plain, content);
  check("plain template → ok:false (caller falls back)", !fb.ok);

  console.log(failed === 0 ? "✓ PASS — exact-layout clone + integrity guard + graceful fallback." : `✗ FAIL (${failed})`);
  if (failed) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
