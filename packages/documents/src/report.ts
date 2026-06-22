import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { ReportContentSchema, TemplateContractError, type ReportContent } from "./types";

export type RenderResult = {
  /** The rendered .docx as a Node Buffer, ready to upload to R2 or stream to the user. */
  buffer: Buffer;
  /** Slots that existed in the content but had no placeholder in the template (informational). */
  unusedData: string[];
};

/**
 * Render an academic report by injecting validated structured content into a
 * LOCKED institutional .docx template.
 *
 * Pipeline (see docs/PLAN.md §4):
 *   structured JSON  →  zod validation  →  docxtemplater injection  →  real .docx
 *
 * The template owns 100% of the formatting (fonts, margins, headers, cover page).
 * We only fill its `{placeholders}`. If the content can't satisfy the template's
 * required slots, we throw instead of shipping a half-broken file.
 */
export function renderReportDocx(
  rawContent: unknown,
  templateBuffer: Buffer,
): RenderResult {
  // 1. Validate the model's output against the contract.
  const parsed = ReportContentSchema.safeParse(rawContent);
  if (!parsed.success) {
    throw new TemplateContractError(
      "Report content does not satisfy the template contract.",
      parsed.error.flatten(),
    );
  }
  const content: ReportContent = parsed.data;

  // Flatten nested objects to dotted keys (e.g. `student.name`) so template tags
  // like {student.name} resolve, while leaving loop arrays (sections, references) intact.
  const data = flattenForTemplate(content);

  // 2. Load the locked template and inject.
  const missingSlots: string[] = [];
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // Any unresolved {placeholder} means the template expects data we didn't
    // provide — exactly the "format break" we refuse to ship. Collect them all,
    // then fail loudly after the pass so the report names every gap at once.
    nullGetter(part: { value?: string; module?: string }) {
      // Loop section tags (#, /, ^) legitimately resolve to nothing — ignore those.
      if (part.module) return "";
      if (part.value) missingSlots.push(part.value);
      return "";
    },
  });

  try {
    doc.render(data);
  } catch (err) {
    throw new TemplateContractError(
      "Template rendering aborted.",
      err instanceof Error ? err.message : err,
    );
  }

  if (missingSlots.length > 0) {
    throw new TemplateContractError(
      `Template has slots the content could not fill: ${[...new Set(missingSlots)].join(", ")}`,
      missingSlots,
    );
  }

  const buffer = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
  return { buffer, unusedData: [] };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Recursively flattens nested plain objects to dotted keys; arrays and scalars pass through. */
function flattenForTemplate(input: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      Object.assign(out, flattenForTemplate(value, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}
