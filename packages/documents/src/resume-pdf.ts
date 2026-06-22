import PDFDocument from "pdfkit";
import { ResumeSchema, type ResumeDensity } from "./resume";

/**
 * PDF rendering of the same resume data, derived from the identical structured fields the
 * DOCX uses (single source of truth — content can't diverge). pdfkit's built-in Times-Roman
 * matches the reference .docx font. Minor spacing differences from the DOCX are acceptable
 * (per the format-derivation approach); the .docx remains the canonical ATS artifact.
 */

// A4 in points. 400 twips ≈ 20pt margins (matches the .docx).
const MARGIN = 20;
const FONT = "Times-Roman";
const FONT_B = "Times-Bold";
const FONT_I = "Times-Italic";

function range(d?: { start?: string; end?: string }): string {
  if (!d) return "";
  return [d.start, d.end].filter(Boolean).join(" - ");
}

export function renderResumePdf(raw: unknown, density: ResumeDensity = "normal"): Promise<{ buffer: Buffer }> {
  const r = ResumeSchema.parse(raw);
  const tight = density === "tight";
  const bodySize = tight ? 9.5 : 10.5;
  const gapAfterEntry = tight ? 4 : 8;
  const gapBullet = tight ? 1 : 2.5;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve({ buffer: Buffer.concat(chunks) }));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const contentW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const COL_L = Math.round(contentW * 0.6);
    const COL_R = contentW - COL_L;

    // Header
    doc.font(FONT_B).fontSize(26).fillColor("#000").text(r.contact.name.toUpperCase(), { align: "center" });
    const contactBits = [r.contact.phone, r.contact.email, r.contact.location, r.contact.linkedin, r.contact.github, r.contact.portfolio].filter(Boolean);
    if (contactBits.length) {
      doc.font(FONT).fontSize(9.5).text(contactBits.join("  |  "), { align: "center" });
    }
    doc.moveDown(0.5);

    const sectionHeading = (text: string) => {
      doc.moveDown(0.2);
      const y0 = doc.y;
      doc.font(FONT_B).fontSize(11.5).fillColor("#000").text(text.toUpperCase(), left, y0);
      const ruleY = doc.y + 1;
      doc.moveTo(left, ruleY).lineTo(left + contentW, ruleY).lineWidth(0.5).strokeColor("#000").stroke();
      doc.moveDown(0.35);
    };

    // A two-column row: left flows/wraps in COL_L; right is right-aligned at the same top.
    const splitRow = (leftText: string, rightText: string, italic: boolean) => {
      const font = italic ? FONT_I : FONT_B;
      const y0 = doc.y;
      doc.font(font).fontSize(bodySize).fillColor("#000");
      doc.text(leftText, left, y0, { width: COL_L });
      const yLeftEnd = doc.y;
      if (rightText) doc.font(font).fontSize(bodySize).text(rightText, left + COL_L, y0, { width: COL_R, align: "right" });
      doc.y = Math.max(yLeftEnd, doc.y);
    };

    const bullet = (text: string) => {
      doc.font(FONT).fontSize(bodySize).fillColor("#000").text(`•  ${text}`, left + 8, doc.y, { width: contentW - 8 });
      doc.y += gapBullet;
    };

    // Summary
    if (r.summary?.trim()) {
      sectionHeading("Professional Summary");
      doc.font(FONT).fontSize(bodySize).fillColor("#000").text(r.summary.trim(), left, doc.y, { width: contentW, align: "justify" });
      doc.y += gapAfterEntry;
    }

    // Skills
    if (r.skills.length) {
      sectionHeading("Skills");
      for (const g of r.skills) {
        const y0 = doc.y;
        doc.font(FONT_B).fontSize(bodySize).fillColor("#000").text(`${g.category}: `, left, y0, { continued: true });
        doc.font(FONT).text(g.items.join(", "));
        doc.y += gapBullet;
      }
      doc.y += gapAfterEntry - gapBullet;
    }

    const entrySection = (title: string, items: { main: string; date: string; role?: string; location?: string; bullets: string[]; link?: string }[]) => {
      if (!items.length) return;
      sectionHeading(title);
      for (const it of items) {
        splitRow(it.main, it.date, false);
        if (it.role || it.location) splitRow(it.role ?? "", it.location ?? "", true);
        for (const b of it.bullets) bullet(b);
        if (it.link) {
          doc.font(FONT_I).fontSize(bodySize).fillColor("#1d4ed8").text("Link to project", left + 8, doc.y, { width: contentW - 8, link: it.link, underline: false });
          doc.fillColor("#000");
          doc.y += gapBullet;
        }
        doc.y += gapAfterEntry;
      }
    };

    entrySection(
      "Professional Experience",
      r.experience.map((e) => ({ main: e.organization, date: range(e.dates), role: e.role, location: e.location, bullets: e.bullets })),
    );
    entrySection(
      "Projects & Outside Experience",
      r.projects.map((p) => ({ main: p.name, date: range(p.dates), role: p.role, location: p.location, bullets: p.bullets, link: p.link })),
    );
    entrySection(
      "Education",
      r.education.map((ed) => ({ main: ed.institution, date: range(ed.dates), role: ed.degree, location: ed.location, bullets: [] })),
    );

    doc.end();
  });
}
