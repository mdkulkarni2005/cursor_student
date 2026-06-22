import PizZip from "pizzip";
import { arr, parse, serialize, phKindOf, shapeTextLen, nodeText, setTxBodyText, type El } from "./pptx-internal";
import { checkPptxIntegrity } from "./pptx-clone";
import type { PptxStructure } from "./pptx-structure";

/**
 * Fill a structured template IN PLACE — the opposite of the clone path. We keep the template's
 * EXACT slides (same parts, same `sldIdLst`, same masters/layouts/images) and only rewrite text:
 *   - metadata slides → set the value cell of each known field
 *   - section slides  → replace the instruction body with the generated bullets for that heading
 *   - preserve slides → untouched
 * Nothing is cloned, added, removed, or re-ordered, so the user's design survives verbatim. The
 * result is run through the same referential integrity guard as the clone path.
 */

export type PptxFillResult = { ok: boolean; buffer?: Buffer; issues: string[] };

/** The main body placeholder shape of a parsed slide doc (most text wins, like detection). */
function findBody(doc: El): El | undefined {
  let body: El | undefined;
  let len = -1;
  for (const sp of arr(doc.getElementsByTagName("p:sp"))) {
    if (phKindOf(sp) === "body") {
      const l = shapeTextLen(sp);
      if (l > len) { body = sp; len = l; }
    }
  }
  return body;
}

export function fillPptxTemplateInPlace(
  templateBuffer: Buffer,
  structure: PptxStructure,
  /** heading (exact, from structure) → bullet lines for that section. */
  contentByHeading: Record<string, string[]>,
  /** field label (exact, from structure) → value to write into the info table. */
  fieldValues: Record<string, string>,
): PptxFillResult {
  let zip: PizZip;
  try {
    zip = new PizZip(templateBuffer);
  } catch {
    return { ok: false, issues: ["Unreadable .pptx."] };
  }

  const injected: string[] = [];

  for (const slide of structure.slides) {
    const file = zip.file(slide.partName);
    if (!file) continue;
    const doc = parse(file.asText());

    if (slide.kind === "metadata") {
      const tbls = doc.getElementsByTagName("a:tbl");
      if (tbls.length === 0) continue;
      const tbl = tbls.item(0)!;
      for (const tr of arr(tbl.getElementsByTagName("a:tr"))) {
        const cells = arr(tr.getElementsByTagName("a:tc")).filter((c) => c.parentNode === tr);
        if (cells.length < 2) continue;
        const label = nodeText(cells[0]!).replace(/\s+/g, " ").replace(/:$/, "").trim();
        const value = fieldValues[label];
        if (value === undefined || value === "") continue;
        setTxBodyText(cells[cells.length - 1]!, [value]);
        injected.push(value);
      }
      zip.file(slide.partName, serialize(doc));
      continue;
    }

    if (slide.kind === "section") {
      const bullets = contentByHeading[slide.heading];
      if (!bullets || bullets.length === 0) continue;
      const body = findBody(doc);
      if (!body) continue;
      setTxBodyText(body, bullets);
      injected.push(slide.heading);
      zip.file(slide.partName, serialize(doc));
      continue;
    }
    // preserve → leave the part untouched.
  }

  const buffer = zip.generate({ type: "nodebuffer" }) as Buffer;

  // Same referential integrity guard the clone path uses; confirm our injected text survived.
  const guard = checkPptxIntegrity(buffer, injected);
  if (!guard.ok) return { ok: false, issues: guard.issues };
  return { ok: true, buffer, issues: [] };
}
