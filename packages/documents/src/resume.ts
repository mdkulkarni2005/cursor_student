import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ExternalHyperlink,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  TableLayoutType,
} from "docx";
import { z } from "zod";

/**
 * Resume = structured content rendered into a single, curated, ATS-friendly format
 * (the locked "house" layout — single column, real text, standard headings, no tables
 * or graphics so ATS parsers read it cleanly). The model/user only ever supplies the
 * DATA below; this deterministic renderer owns the format, so it can never break.
 *
 * Every section is optional/droppable — most students have no professional experience
 * and lean on Projects; an empty section is omitted entirely (no dangling heading).
 */

// Bounds are generous for any real resume (never hit by legitimate AI-generated or hand-edited
// content) but stop a crafted payload (e.g. via the in-browser editor's save action) from writing
// an arbitrarily huge document that then gets persisted and re-rendered to DOCX.
const shortText = z.string().max(300);
const mediumText = z.string().max(600); // resume bullets / skill items — can run a full sentence
const longText = z.string().max(2000);
const bulletsField = z.array(mediumText.min(1)).max(30).default([]);

const dateRange = z.object({
  start: shortText.optional(), // free text, e.g. "Jan 2026" / "Nov 2022"
  end: shortText.optional(), // e.g. "Present" / "Jul 2026"
});

export const ResumeContactSchema = z.object({
  name: shortText.min(1),
  phone: shortText.optional(),
  email: shortText.optional(),
  location: shortText.optional(),
  linkedin: shortText.optional(),
  github: shortText.optional(),
  portfolio: shortText.optional(),
});

/** "Languages: TypeScript, JavaScript" — a labeled skills line. */
export const ResumeSkillGroupSchema = z.object({
  category: shortText.min(1),
  items: z.array(mediumText.min(1)).min(1).max(30),
});

export const ResumeExperienceSchema = z.object({
  organization: shortText.min(1),
  role: shortText.optional(),
  location: shortText.optional(),
  dates: dateRange.optional(),
  bullets: bulletsField,
});

export const ResumeProjectSchema = z.object({
  name: shortText.min(1),
  role: shortText.optional(),
  location: shortText.optional(),
  dates: dateRange.optional(),
  bullets: bulletsField,
  link: shortText.optional(),
});

export const ResumeEducationSchema = z.object({
  institution: shortText.min(1),
  degree: shortText.optional(),
  location: shortText.optional(),
  dates: dateRange.optional(),
});

export const ResumeSchema = z.object({
  contact: ResumeContactSchema,
  summary: longText.optional(),
  skills: z.array(ResumeSkillGroupSchema).max(30).default([]),
  experience: z.array(ResumeExperienceSchema).max(30).default([]),
  projects: z.array(ResumeProjectSchema).max(30).default([]),
  education: z.array(ResumeEducationSchema).max(20).default([]),
});

export type ResumeContact = z.infer<typeof ResumeContactSchema>;
export type ResumeSkillGroup = z.infer<typeof ResumeSkillGroupSchema>;
export type ResumeExperience = z.infer<typeof ResumeExperienceSchema>;
export type ResumeProject = z.infer<typeof ResumeProjectSchema>;
export type ResumeEducation = z.infer<typeof ResumeEducationSchema>;
export type Resume = z.infer<typeof ResumeSchema>;

/** "tight" re-renders with smaller spacing to fit one page (3.3 one-page button). */
export type ResumeDensity = "normal" | "tight";

// --- Format constants (extracted exactly from the reference .docx) ---
const FONT = "Times New Roman";
const PAGE_W = 11905; // A4
const PAGE_H = 16837;
const MARGIN = 400; // ~0.28" all sides
const CONTENT_W = PAGE_W - MARGIN * 2; // 11105
const COL_L = 6663; // left cell (org/role) — wraps long text inside the cell
const COL_R = 4442; // right cell (date/location) — stays anchored right
// Point sizes are half-points: name 31pt, headings 12pt, body 11pt.
const SZ_NAME = 62;
const SZ_HEADING = 24;
const SZ_BODY = 22;

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
const CELL_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };
const TABLE_BORDERS = {
  ...CELL_BORDERS,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};
const CELL_MARGINS = { top: 4, bottom: 4, left: 4, right: 4 };

function fmtRange(d?: { start?: string; end?: string }): string {
  if (!d) return "";
  return [d.start, d.end].filter(Boolean).join(" - ");
}

export async function renderResumeDocx(
  raw: unknown,
  density: ResumeDensity = "normal",
): Promise<{ buffer: Buffer }> {
  const r = ResumeSchema.parse(raw);
  const tight = density === "tight";
  const afterEntry = tight ? 60 : 120;
  const afterBullet = tight ? 0 : 20;
  const beforeSection = tight ? 120 : 160;

  const children: (Paragraph | Table)[] = [];

  // --- Header: centered name + contact line (email/linkedin are clickable) ---
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: r.contact.name.toUpperCase(), bold: true, font: FONT, size: SZ_NAME })],
    }),
  );
  const contactRuns: (TextRun | ExternalHyperlink)[] = [];
  const sep = () => new TextRun({ text: "  |  ", font: FONT, size: SZ_BODY });
  const linkRun = (text: string, href: string) =>
    new ExternalHyperlink({
      link: href,
      children: [new TextRun({ text, font: FONT, size: SZ_BODY, style: "Hyperlink" })],
    });
  const textRun = (text: string) => new TextRun({ text, font: FONT, size: SZ_BODY });
  const pushContact = (run: TextRun | ExternalHyperlink) => {
    if (contactRuns.length) contactRuns.push(sep());
    contactRuns.push(run);
  };
  if (r.contact.phone) pushContact(textRun(r.contact.phone));
  if (r.contact.email) pushContact(linkRun(r.contact.email, `mailto:${r.contact.email}`));
  if (r.contact.location) pushContact(textRun(r.contact.location));
  if (r.contact.linkedin) pushContact(linkRun(r.contact.linkedin, hrefOf(r.contact.linkedin)));
  if (r.contact.github) pushContact(linkRun(r.contact.github, hrefOf(r.contact.github)));
  if (r.contact.portfolio) pushContact(linkRun(r.contact.portfolio, hrefOf(r.contact.portfolio)));
  if (contactRuns.length) {
    children.push(
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: contactRuns }),
    );
  }

  // Section heading: bold uppercase 12pt with a thin full-width bottom rule (paragraph border).
  const sectionHeading = (text: string) =>
    new Paragraph({
      spacing: { before: beforeSection, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000", space: 1 } },
      children: [new TextRun({ text: text.toUpperCase(), bold: true, font: FONT, size: SZ_HEADING })],
    });

  // A borderless 2-col row: left text (left-aligned) ‖ right text (right-aligned).
  const cell = (width: number, runs: (TextRun | ExternalHyperlink)[], align?: (typeof AlignmentType)[keyof typeof AlignmentType]) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      borders: CELL_BORDERS,
      margins: CELL_MARGINS,
      children: [new Paragraph({ alignment: align, spacing: { line: 240 }, children: runs })],
    });

  // The org/date + role/location header block (drops row 2 when both role+location absent).
  const entryTable = (
    leftMain: string,
    rightMain: string,
    role?: string,
    location?: string,
  ): Table => {
    const run = (text: string, italics: boolean) =>
      text ? [new TextRun({ text, bold: !italics, italics, font: FONT, size: SZ_BODY })] : [];
    const rows = [
      new TableRow({
        children: [
          cell(COL_L, run(leftMain, false)),
          cell(COL_R, run(rightMain, false), AlignmentType.RIGHT),
        ],
      }),
    ];
    if (role || location) {
      rows.push(
        new TableRow({
          children: [
            cell(COL_L, run(role ?? "", true)),
            cell(COL_R, run(location ?? "", true), AlignmentType.RIGHT),
          ],
        }),
      );
    }
    return new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [COL_L, COL_R],
      borders: TABLE_BORDERS,
      layout: TableLayoutType.FIXED,
      rows,
    });
  };

  const bullet = (text: string, runs?: (TextRun | ExternalHyperlink)[]) =>
    new Paragraph({
      bullet: { level: 0 },
      spacing: { after: afterBullet, line: 240 },
      children: runs ?? [new TextRun({ text, font: FONT, size: SZ_BODY })],
    });
  const gap = () => new Paragraph({ spacing: { after: afterEntry }, children: [] });

  // --- Professional Summary ---
  if (r.summary?.trim()) {
    children.push(sectionHeading("Professional Summary"));
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: afterEntry, line: 240 },
        children: [new TextRun({ text: r.summary.trim(), font: FONT, size: SZ_BODY })],
      }),
    );
  }

  // --- Skills (labeled lines: bold category + items) ---
  if (r.skills.length) {
    children.push(sectionHeading("Skills"));
    for (const g of r.skills) {
      children.push(
        new Paragraph({
          spacing: { after: afterBullet, line: 240 },
          children: [
            new TextRun({ text: `${g.category}: `, bold: true, font: FONT, size: SZ_BODY }),
            new TextRun({ text: g.items.join(", "), font: FONT, size: SZ_BODY }),
          ],
        }),
      );
    }
  }

  // --- Professional Experience ---
  if (r.experience.length) {
    children.push(sectionHeading("Professional Experience"));
    for (const e of r.experience) {
      children.push(entryTable(e.organization, fmtRange(e.dates), e.role, e.location));
      for (const b of e.bullets) children.push(bullet(b));
      children.push(gap());
    }
  }

  // --- Projects & Outside Experience ---
  if (r.projects.length) {
    children.push(sectionHeading("Projects & Outside Experience"));
    for (const p of r.projects) {
      children.push(entryTable(p.name, fmtRange(p.dates), p.role, p.location));
      for (const b of p.bullets) children.push(bullet(b));
      if (p.link) {
        children.push(
          bullet("", [
            new ExternalHyperlink({
              link: hrefOf(p.link),
              children: [new TextRun({ text: "Link to project", italics: true, font: FONT, size: SZ_BODY, style: "Hyperlink" })],
            }),
          ]),
        );
      }
      children.push(gap());
    }
  }

  // --- Education ---
  if (r.education.length) {
    children.push(sectionHeading("Education"));
    for (const ed of r.education) {
      children.push(entryTable(ed.institution, fmtRange(ed.dates), ed.degree, ed.location));
    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: SZ_BODY } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_W, height: PAGE_H },
            margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
          },
        },
        children,
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return { buffer };
}

/** Make a bare URL/handle clickable (prefix https:// when missing a scheme). */
function hrefOf(value: string): string {
  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}
