import PptxGenJS from "pptxgenjs";
import { z } from "zod";
import { TemplateContractError } from "./types";
import type { PptxTheme } from "./pptx-theme";

/**
 * Structured PPT content — the only thing the AI produces for a deck. Rendered
 * deterministically into a real .pptx by pptxgenjs (per-college .pptx templates
 * can be layered on later, same content/format split as reports).
 */
/** The visual shape of a content slide. Missing ⇒ "bullets" (back-compat with old decks). */
export const PptLayoutSchema = z.enum([
  "bullets",
  "two-column",
  "image",
  "table",
  "diagram",
  "stat",
  "quote",
  "section",
]);
export type PptLayout = z.infer<typeof PptLayoutSchema>;

/**
 * Inline-formatted text. A "run" is a span of text with optional formatting; a paragraph is an
 * array of runs. `RichText` is EITHER a plain string (unformatted — what the AI emits, and what
 * every old deck stored) OR an array of runs (what the in-app editor produces). This keeps the
 * model fully backward-compatible while letting bold/italic/colour/font survive into the .pptx.
 */
export const PptRunSchema = z.object({
  text: z.string(),
  b: z.boolean().optional(),
  i: z.boolean().optional(),
  u: z.boolean().optional(),
  color: z.string().optional(), // hex, no leading '#'
  face: z.string().optional(),
  size: z.number().optional(), // points
});
export const RichTextSchema = z.union([z.string(), z.array(PptRunSchema)]);
export type PptRun = z.infer<typeof PptRunSchema>;
export type RichText = z.infer<typeof RichTextSchema>;

/** Flatten rich text to a plain string (for templates, PPT→Report, and length checks). */
export function richToPlain(r: RichText | undefined): string {
  if (!r) return "";
  return typeof r === "string" ? r : r.map((run) => run.text).join("");
}
/** Map rich text to pptxgenjs run objects, merging in caller options (bullet, breakLine, …). */
export function richToRuns(
  r: RichText | undefined,
  base: Record<string, unknown> = {},
): { text: string; options: Record<string, unknown> }[] {
  const runs: PptRun[] = typeof r === "string" || !r ? [{ text: richToPlain(r) }] : r;
  return runs.map((run) => ({
    text: run.text,
    options: {
      ...base,
      ...(run.b ? { bold: true } : {}),
      ...(run.i ? { italic: true } : {}),
      ...(run.u ? { underline: { style: "sng" } } : {}),
      ...(run.color ? { color: run.color } : {}),
      ...(run.face ? { fontFace: run.face } : {}),
      ...(run.size ? { fontSize: run.size } : {}),
    },
  }));
}

export const PptTableSchema = z.object({
  headers: z.array(z.string()).min(1).max(5),
  rows: z.array(z.array(z.string())).min(1).max(8),
});
export const PptDiagramSchema = z.object({
  kind: z.enum(["process", "cycle", "hierarchy"]),
  nodes: z.array(z.string().min(1)).min(2).max(6),
});
export const PptStatSchema = z.object({ value: z.string().min(1), label: z.string().min(1) });
export const PptColumnsSchema = z.object({
  leftTitle: z.string().optional(),
  rightTitle: z.string().optional(),
  left: z.array(RichTextSchema).min(1).max(6),
  right: z.array(RichTextSchema).min(1).max(6),
});
export const PptQuoteSchema = z.object({ text: RichTextSchema, attribution: z.string().optional() });

/**
 * A content slide. A flat (non-union) shape keeps it easy for the model to emit and fully
 * backward-compatible: old `{ heading, bullets }` decks still validate (layout defaults to
 * "bullets"). Block fields (table/diagram/stats/columns/quote) carry the data for richer layouts.
 */
export const PptSlideSchema = z.object({
  layout: PptLayoutSchema.default("bullets"),
  heading: RichTextSchema.default(""),
  bullets: z.array(RichTextSchema).max(8).default([]),
  columns: PptColumnsSchema.optional(),
  table: PptTableSchema.optional(),
  diagram: PptDiagramSchema.optional(),
  stats: z.array(PptStatSchema).min(2).max(4).optional(),
  quote: PptQuoteSchema.optional(),
  notes: z.string().optional(),
  /** R2 object key for this slide's image (NOT base64). Resolved to bytes at render time. */
  image: z.string().optional(),
  /** User-set size multiplier for the slide's image (default 1 = the layout's normal side-panel size). */
  imageScale: z.number().min(0.5).max(1.5).optional(),
});

/**
 * The resolved render theme (brand colors + fonts) persisted alongside the deck so the in-app
 * HTML canvas can render brand-approximate without re-reading the uploaded .pptx. These are the
 * exact values `renderPptx` draws with — see `resolvePptTheme`.
 */
export const PptThemeSchema = z.object({
  dark: z.string(),
  light: z.string(),
  accent: z.string(),
  headColor: z.string(),
  headFont: z.string(),
  bodyFont: z.string(),
});

export const PptContentSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  slides: z.array(PptSlideSchema).min(3),
  theme: PptThemeSchema.optional(),
});

export type PptSlide = z.infer<typeof PptSlideSchema>;
export type PptTable = z.infer<typeof PptTableSchema>;
export type PptDiagram = z.infer<typeof PptDiagramSchema>;
export type PptStat = z.infer<typeof PptStatSchema>;
export type PptColumns = z.infer<typeof PptColumnsSchema>;
export type PptQuote = z.infer<typeof PptQuoteSchema>;
export type PptTheme = z.infer<typeof PptThemeSchema>;
export type PptContent = z.infer<typeof PptContentSchema>;

/** Resolve a user's extracted .pptx theme (or nothing) into the concrete colors/fonts the deck
 *  is drawn with. Single source of truth shared by `renderPptx` and the in-app slide canvas. */
export function resolvePptTheme(theme?: PptxTheme): PptTheme {
  return {
    dark: theme?.colors.dk1 ?? "0A0E1A",
    light: theme?.colors.lt1 ?? "F1F5F9",
    accent: theme?.colors.accent1 ?? "22D3EE",
    headColor: theme?.colors.dk1 ?? "15191F",
    headFont: theme?.fonts.major ?? "Arial",
    bodyFont: theme?.fonts.minor ?? "Arial",
  };
}

// Page geometry (LAYOUT_WIDE = 13.33 × 7.5 in). Content area sits below the heading.
const BODY = "333333";
const MUTED = "667085";

type Pptx = InstanceType<typeof PptxGenJS>;
type Slide = ReturnType<Pptx["addSlide"]>;
type Resolved = ReturnType<typeof resolvePptTheme>;

function addHeading(slide: Slide, heading: RichText, t: Resolved) {
  if (!richToPlain(heading)) return;
  slide.addText(richToRuns(heading), {
    x: 0.6, y: 0.4, w: 12.1, h: 0.9,
    fontSize: 26, bold: true, color: t.headColor, fontFace: t.headFont,
  });
  // Accent rule under the heading.
  slide.addShape("line", { x: 0.62, y: 1.32, w: 2.2, h: 0, line: { color: t.accent, width: 2.5 } });
}

function bulletsText(slide: Slide, bullets: RichText[], t: Resolved, x: number, w: number, y = 1.6, h = 5.2) {
  if (!bullets.length) return;
  // Each bullet is its own paragraph; mark the first run of each as a bullet and break the line at
  // the end of every paragraph so runs keep their inline formatting (bold/italic/colour/…).
  const runs = bullets.flatMap((b) => {
    const rs = richToRuns(b);
    return rs.map((r, i) => ({
      text: r.text,
      options: { ...r.options, ...(i === 0 ? { bullet: true } : {}), ...(i === rs.length - 1 ? { breakLine: true } : {}) },
    }));
  });
  slide.addText(runs, { x, y, w, h, fontSize: 18, color: BODY, fontFace: t.bodyFont, valign: "top", lineSpacingMultiple: 1.3, paraSpaceAfter: 8 });
}

function renderDiagram(slide: Slide, kind: string, nodes: string[], t: Resolved, totalW = 12.1) {
  const y = kind === "hierarchy" ? 2.9 : 3.0;
  if (kind === "hierarchy") {
    // Root on top, children in a row below, connected by lines.
    const [root, ...kids] = nodes;
    const rootW = Math.min(3.4, totalW * 0.55), rootX = 0.6 + (totalW - rootW) / 2;
    slide.addShape("roundRect", { x: rootX, y: 1.7, w: rootW, h: 1.0, fill: { color: t.accent }, line: { color: t.accent } });
    slide.addText(root ?? "", { x: rootX, y: 1.7, w: rootW, h: 1.0, align: "center", valign: "middle", color: "FFFFFF", bold: true, fontSize: 15, fontFace: t.bodyFont });
    const n = Math.max(kids.length, 1), gap = 0.4, boxW = (totalW - gap * (n - 1)) / n;
    kids.forEach((node, i) => {
      const x = 0.6 + i * (boxW + gap);
      slide.addShape("line", { x: rootX + rootW / 2, y: 2.7, w: x + boxW / 2 - (rootX + rootW / 2), h: 1.1, line: { color: MUTED, width: 1 } });
      slide.addShape("roundRect", { x, y: 3.8, w: boxW, h: 1.3, fill: { color: "F1F5F9" }, line: { color: t.accent, width: 1 } });
      slide.addText(node, { x, y: 3.8, w: boxW, h: 1.3, align: "center", valign: "middle", color: t.headColor, fontSize: 14, fontFace: t.bodyFont });
    });
    return;
  }
  // process / cycle → boxes left→right with arrows between.
  const n = nodes.length, arrow = 0.5, gap = 0.15;
  const boxW = (totalW - (arrow + gap * 2) * (n - 1)) / n, h = 1.5;
  nodes.forEach((node, i) => {
    const x = 0.6 + i * (boxW + arrow + gap * 2);
    slide.addShape("roundRect", { x, y, w: boxW, h, fill: { color: i % 2 ? "F1F5F9" : t.accent }, line: { color: t.accent, width: 1 } });
    slide.addText(node, { x, y, w: boxW, h, align: "center", valign: "middle", color: i % 2 ? t.headColor : "FFFFFF", bold: true, fontSize: 13, fontFace: t.bodyFont });
    if (i < n - 1) {
      slide.addShape("rightArrow", { x: x + boxW + gap, y: y + h / 2 - 0.18, w: arrow, h: 0.36, fill: { color: t.accent }, line: { color: t.accent } });
    }
  });
  if (kind === "cycle") {
    slide.addText("↻ repeats", { x: 0.6, y: y + h + 0.3, w: totalW, h: 0.4, align: "center", color: MUTED, italic: true, fontSize: 13, fontFace: t.bodyFont });
  }
}

// Consistent side-panel image slot reused by every content layout — shrink the layout's own
// content width to SIDE_CONTENT_W when an image is present and draw the picture in this slot.
const SIDE_IMG = { x: 8.3, y: 1.7, w: 4.0, h: 4.0 } as const;
const SIDE_CONTENT_W = 7.0;
function addSideImage(slide: Slide, image?: string | null, scale = 1) {
  if (!image) return;
  const k = Math.min(1.3, Math.max(0.5, scale));
  const cx = SIDE_IMG.x + SIDE_IMG.w / 2, cy = SIDE_IMG.y + SIDE_IMG.h / 2;
  const w = SIDE_IMG.w * k, h = SIDE_IMG.h * k;
  slide.addImage({ data: image, x: cx - w / 2, y: cy - h / 2, w, h, sizing: { type: "contain", w, h } });
}

// Vertical space actually available for a table's body (from just under the heading to the footer rule).
const TABLE_AREA_H = 5.2;
const TABLE_FONT_SIZES = [14, 13, 12, 11, 10, 9];

/** Rough estimate of wrapped line count for `text` in a column `colW` inches wide at `fontSize` pt. */
function estimateLines(text: string, colW: number, fontSize: number): number {
  const avgCharW = (fontSize * 0.52) / 72; // inches
  const usableW = Math.max(0.3, colW - 0.2); // minus cell padding
  const charsPerLine = Math.max(1, Math.floor(usableW / avgCharW));
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

/** Pick the largest font size (from TABLE_FONT_SIZES) whose estimated total row height fits
 *  within TABLE_AREA_H, so dense tables shrink their text instead of silently overflowing the slide. */
function fitTableFontSize(table: PptTable, colWidths: number[]): number {
  const rows: string[][] = [table.headers, ...table.rows];
  for (const fontSize of TABLE_FONT_SIZES) {
    const lineH = (fontSize * 1.25) / 72;
    let total = 0;
    for (const row of rows) {
      const lines = Math.max(...row.map((cell, i) => estimateLines(cell, colWidths[i] ?? colWidths[0]!, fontSize)));
      total += Math.max(0.4, lines * lineH + 0.14);
    }
    if (total <= TABLE_AREA_H || fontSize === TABLE_FONT_SIZES[TABLE_FONT_SIZES.length - 1]) return fontSize;
  }
  return TABLE_FONT_SIZES[TABLE_FONT_SIZES.length - 1]!;
}

/** Branded chrome on every content slide: a thin top accent band + a footer rule with the deck
 *  line on the left and the slide number on the right. Makes plain slides look designed. */
function addChrome(slide: Slide, t: Resolved, footer: string, num: number) {
  slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.16, fill: { color: t.accent }, line: { type: "none" } });
  slide.addShape("line", { x: 0.6, y: 7.06, w: 12.13, h: 0, line: { color: "E2E8F0", width: 1 } });
  if (footer) slide.addText(footer, { x: 0.6, y: 7.08, w: 10.5, h: 0.32, fontSize: 9, color: "94A3B8", fontFace: t.bodyFont });
  slide.addText(String(num), { x: 12.0, y: 7.08, w: 0.73, h: 0.32, fontSize: 9, color: "94A3B8", align: "right", fontFace: t.bodyFont });
}

function renderSlide(pptx: Pptx, s: PptSlide, t: Resolved, opts: { image?: string | null; footer: string; num: number }) {
  const { image, footer, num } = opts;
  const slide = pptx.addSlide();

  // Section divider — full-bleed colored slide, no heading rule. A generated image sits as a
  // framed panel in the free lower-right area (heading/subheading occupy the vertical center band).
  if (s.layout === "section") {
    slide.background = { color: t.dark };
    slide.addShape("rect", { x: 0, y: 3.46, w: 13.33, h: 0.05, fill: { color: t.accent }, line: { type: "none" } });
    slide.addText(richToRuns(s.heading), { x: 0.8, y: 2.5, w: 11.7, h: 1.0, align: "center", bold: true, color: t.light, fontSize: 34, fontFace: t.headFont });
    if (s.bullets[0]) slide.addText(richToRuns(s.bullets[0]), { x: 0.8, y: 3.65, w: 11.7, h: 0.7, align: "center", color: t.accent, fontSize: 18, fontFace: t.headFont });
    if (image) {
      const k = Math.min(1.3, Math.max(0.5, s.imageScale ?? 1));
      const bw = 3.2 * k, bh = 2.1 * k, cx = 9.4 + 3.2 / 2, cy = 4.5 + 2.1 / 2;
      slide.addImage({ data: image, x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh, sizing: { type: "contain", w: bw, h: bh }, rounding: true });
    }
    if (s.notes) slide.addNotes(s.notes);
    return;
  }

  slide.background = { color: "FFFFFF" };
  addChrome(slide, t, footer, num);

  if (s.layout === "quote") {
    const text = richToPlain(s.quote?.text) || richToPlain(s.heading);
    const w = image ? SIDE_IMG.x - 1.4 - 0.3 : 10.7;
    slide.addShape("rect", { x: 1.0, y: 2.1, w: 0.12, h: 2.6, fill: { color: t.accent }, line: { type: "none" } });
    slide.addText(`“${text}”`, { x: 1.4, y: 2.2, w, h: 2.4, align: "left", italic: true, color: t.headColor, fontSize: 30, fontFace: t.headFont, valign: "middle", lineSpacingMultiple: 1.2 });
    if (s.quote?.attribution) slide.addText(`— ${s.quote.attribution}`, { x: 1.4, y: 4.8, w, h: 0.6, align: "left", color: t.accent, fontSize: 18, fontFace: t.bodyFont });
    addSideImage(slide, image, s.imageScale);
    if (s.notes) slide.addNotes(s.notes);
    return;
  }

  addHeading(slide, s.heading, t);

  switch (s.layout) {
    case "table": {
      if (s.table) {
        const tableW = image ? SIDE_CONTENT_W : 12.1;
        const ncols = Math.max(s.table.headers.length, 1);
        const colWidths = s.table.headers.map(() => tableW / ncols);
        const fontSize = fitTableFontSize(s.table, colWidths);
        const head = s.table.headers.map((c) => ({ text: c, options: { bold: true, color: "FFFFFF", fill: { color: t.accent }, fontFace: t.bodyFont } }));
        const body = s.table.rows.map((r, ri) => r.map((c) => ({ text: c, options: { color: BODY, fontFace: t.bodyFont, fill: { color: ri % 2 ? "F1F5F9" : "FFFFFF" } } })));
        slide.addTable([head, ...body], { x: 0.6, y: 1.7, w: tableW, border: { type: "solid", color: "E2E8F0", pt: 1 }, fontSize, valign: "middle", rowH: 0.35, align: "left", autoPage: false });
      } else bulletsText(slide, s.bullets, t, 0.8, image ? SIDE_CONTENT_W : 11.7);
      addSideImage(slide, image, s.imageScale);
      break;
    }
    case "diagram": {
      if (s.diagram) renderDiagram(slide, s.diagram.kind, s.diagram.nodes, t, image ? SIDE_CONTENT_W : 12.1);
      else bulletsText(slide, s.bullets, t, 0.8, image ? SIDE_CONTENT_W : 11.7);
      addSideImage(slide, image, s.imageScale);
      break;
    }
    case "stat": {
      const stats = s.stats ?? [];
      if (stats.length) {
        const totalW = image ? SIDE_CONTENT_W : 12.1;
        const n = stats.length, gap = 0.5, boxW = (totalW - gap * (n - 1)) / n;
        // Shrink the big value's font so it always fits on ONE line within its box — a fixed 54pt
        // wraps to 2-3 lines for longer values (e.g. "120ms") in a narrow box, overlapping the label.
        const valueFontSizes = [54, 46, 38, 32, 26, 22];
        stats.forEach((st, i) => {
          const x = 0.6 + i * (boxW + gap);
          // Bold display-weight digits run wider per character than the body-text estimate
          // `estimateLines` is tuned for, so bias its box-width input down before checking single-line fit.
          const fontSize = valueFontSizes.find((fs) => estimateLines(st.value, boxW * 0.7, fs) === 1) ?? valueFontSizes[valueFontSizes.length - 1]!;
          slide.addText(st.value, { x, y: 2.4, w: boxW, h: 1.4, align: "center", valign: "bottom", bold: true, color: t.accent, fontSize, fontFace: t.headFont });
          slide.addText(st.label, { x, y: 3.9, w: boxW, h: 1.0, align: "center", color: BODY, fontSize: 16, fontFace: t.bodyFont });
        });
      } else bulletsText(slide, s.bullets, t, 0.8, image ? SIDE_CONTENT_W : 11.7);
      addSideImage(slide, image, s.imageScale);
      break;
    }
    case "two-column": {
      const c = s.columns;
      if (c) {
        const colW = image ? (SIDE_CONTENT_W - 0.5) / 2 : 5.7;
        const rightX = 0.7 + colW + 0.5;
        if (c.leftTitle) slide.addText(c.leftTitle, { x: 0.7, y: 1.6, w: colW, h: 0.5, bold: true, color: t.accent, fontSize: 16, fontFace: t.headFont });
        if (c.rightTitle) slide.addText(c.rightTitle, { x: rightX, y: 1.6, w: colW, h: 0.5, bold: true, color: t.accent, fontSize: 16, fontFace: t.headFont });
        const top = c.leftTitle || c.rightTitle ? 2.15 : 1.6;
        bulletsText(slide, c.left, t, 0.7, colW, top, 4.6);
        bulletsText(slide, c.right, t, rightX, colW, top, 4.6);
      } else bulletsText(slide, s.bullets, t, 0.8, image ? SIDE_CONTENT_W : 11.7);
      addSideImage(slide, image, s.imageScale);
      break;
    }
    case "image":
    default: {
      // bullets (and the dedicated "image" layout) — place a generated image to the side.
      bulletsText(slide, s.bullets, t, 0.8, image ? SIDE_CONTENT_W : 11.7);
      addSideImage(slide, image, s.imageScale);
    }
  }
  if (s.notes) slide.addNotes(s.notes);
}

export async function renderPptx(
  raw: unknown,
  theme?: PptxTheme,
  /** Optional per-slide images (data URLs), aligned to `content.slides` by index. */
  images?: (string | null | undefined)[],
): Promise<{ buffer: Buffer }> {
  const parsed = PptContentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new TemplateContractError(
      "PPT content does not satisfy the contract.",
      parsed.error.flatten(),
    );
  }
  const content = parsed.data;
  const t = resolvePptTheme(theme);

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pptx.author = "KrackIT";

  // Title slide.
  const title = pptx.addSlide();
  title.background = { color: t.dark };
  title.addText(content.title, {
    x: 0.6, y: 2.6, w: 12.1, h: 1.4,
    fontSize: 36, bold: true, color: t.light, align: "center", fontFace: t.headFont,
  });
  // Accent rule between title and subtitle.
  title.addShape("rect", { x: 5.66, y: 4.0, w: 2.0, h: 0.06, fill: { color: t.accent }, line: { type: "none" } });
  title.addText(content.subtitle, {
    x: 0.6, y: 4.2, w: 12.1, h: 0.6,
    fontSize: 18, color: t.accent, align: "center", fontFace: t.headFont,
  });

  const footer = content.subtitle;

  content.slides.forEach((s, i) => renderSlide(pptx, s, t, { image: images?.[i], footer, num: i + 2 }));

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return { buffer: out };
}
