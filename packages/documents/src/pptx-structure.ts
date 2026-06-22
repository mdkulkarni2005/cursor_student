import PizZip from "pizzip";
import { arr, parse, phKindOf, shapeTextLen, nodeText, slidePartOrder, type El } from "./pptx-internal";

/**
 * Structure detection for an uploaded .pptx. Many college templates are not "designed blank
 * decks" — they're fill-in scaffolds: an info slide (a key:value table), a fixed run of section
 * slides each carrying a heading + an INSTRUCTION ("Brief overview of the internship…"), and
 * closing slides ("Thank You"). To honour such a template we must keep its EXACT slides and fill
 * the right part of each — never invent a slide count. This module reads that structure; the
 * fill-in-place engine (`pptx-fill.ts`) writes into it.
 */

export type TemplateField = { label: string; value: string; isPlaceholder: boolean };

export type TemplateSlide =
  /** A key:value info table (A.Y., Name, PRN, …) — values are field-filled, not content-written. */
  | { kind: "metadata"; partName: string; index: number; fields: TemplateField[] }
  /** A section: a heading + an instruction telling the student what to write here. */
  | { kind: "section"; partName: string; index: number; heading: string; instruction: string }
  /** Cover/closing/decorative — preserved verbatim. */
  | { kind: "preserve"; partName: string; index: number; heading?: string };

export type PptxStructure = {
  ok: boolean;
  /** True when at least one metadata or section slide was found (→ use the fill-in-place path). */
  structured: boolean;
  slides: TemplateSlide[];
  issues: string[];
};

// A value that's clearly a fill-in stub rather than real content.
function looksPlaceholder(v: string): boolean {
  const s = v.trim();
  if (!s) return true;
  if (/^[xyz\s./]+$/i.test(s)) return true; // XYZ, XY, X.Y.
  if (/from\s+to\s+from/i.test(s)) return true; // "From to From (Date)"
  if (/^(tbd|n\/?a|na|—|-|_+|\.+)$/i.test(s)) return true;
  if (/^(mr\.?\s*\/?\s*dr\.?|dr\.?\s*\/?\s*mr\.?)\.?\s*(xyz)?$/i.test(s)) return true; // "Mr./Dr. XYZ"
  return false;
}

// Closing / Q&A slides we must not write content into.
const CLOSING_RE = /\b(thank\s*you|thanks|q\s*&\s*a|questions?|queries|doubts|gracias)\b/i;

/** Read the key:value rows of the first table on a slide. Last cell = value (the ":" is its own col). */
function tableFields(doc: El): TemplateField[] {
  const tbls = doc.getElementsByTagName("a:tbl");
  if (tbls.length === 0) return [];
  const tbl = tbls.item(0)!;
  const fields: TemplateField[] = [];
  for (const tr of arr(tbl.getElementsByTagName("a:tr"))) {
    const cells = arr(tr.getElementsByTagName("a:tc")).filter((c) => c.parentNode === tr);
    if (cells.length < 2) continue;
    const label = nodeText(cells[0]!).replace(/\s+/g, " ").replace(/:$/, "").trim();
    if (!label) continue;
    const valueCell = cells[cells.length - 1]!;
    const value = nodeText(valueCell).trim();
    // Skip a row whose "value" is just the colon separator (2-col layouts).
    if (value === ":" ) continue;
    fields.push({ label, value, isPlaceholder: looksPlaceholder(value) });
  }
  return fields;
}

/** Title + main body placeholder text of a slide, if it has them. */
function titleAndBody(doc: El): { heading: string; instruction: string } | null {
  let title: El | undefined;
  let body: El | undefined;
  let bodyLen = -1;
  for (const sp of arr(doc.getElementsByTagName("p:sp"))) {
    const kind = phKindOf(sp);
    if (kind === "title" && !title) title = sp;
    else if (kind === "body") {
      const len = shapeTextLen(sp);
      if (len > bodyLen) { body = sp; bodyLen = len; }
    }
  }
  if (!title || !body) return null;
  return { heading: nodeText(title).replace(/\s+/g, " ").trim(), instruction: nodeText(body).replace(/\s+/g, " ").trim() };
}

export function inspectPptxStructure(buffer: Buffer): PptxStructure {
  let zip: PizZip;
  try {
    zip = new PizZip(buffer);
  } catch {
    return { ok: false, structured: false, slides: [], issues: ["Unreadable .pptx."] };
  }
  if (!zip.file("ppt/presentation.xml")) {
    return { ok: false, structured: false, slides: [], issues: ["Not a valid presentation."] };
  }

  const order = slidePartOrder(zip);
  if (order.length === 0) return { ok: false, structured: false, slides: [], issues: ["No slides found."] };

  const slides: TemplateSlide[] = [];
  order.forEach((partName, index) => {
    const f = zip.file(partName);
    if (!f) return;
    const doc = parse(f.asText());

    // 1) Info table → metadata (takes priority; an info slide may also have a title).
    const fields = tableFields(doc);
    if (fields.length >= 2) {
      slides.push({ kind: "metadata", partName, index, fields });
      return;
    }

    // 2) Title + body placeholder.
    const tb = titleAndBody(doc);
    if (tb && tb.heading) {
      // Closing slide (Thank You / Q&A) → preserve.
      if (CLOSING_RE.test(tb.heading)) {
        slides.push({ kind: "preserve", partName, index, heading: tb.heading });
        return;
      }
      // A real fillable section has an instruction body of some substance.
      if (tb.instruction.length >= 15) {
        slides.push({ kind: "section", partName, index, heading: tb.heading, instruction: tb.instruction });
        return;
      }
    }

    // 3) Everything else preserved verbatim.
    slides.push({ kind: "preserve", partName, index, heading: tb?.heading });
  });

  const structured = slides.some((s) => s.kind === "section" || s.kind === "metadata");
  return { ok: true, structured, slides, issues: [] };
}
