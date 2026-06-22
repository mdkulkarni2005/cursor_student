import PizZip from "pizzip";
import { DOMParser, XMLSerializer, type Element, type Node } from "@xmldom/xmldom";

/**
 * Fill a USER-UPLOADED .docx template without disturbing its formatting.
 *
 * The model never emits the file. We:
 *   1. PRE-CHECK the upload (valid, unlocked OOXML with detectable headings)
 *   2. EXTRACT its section headings
 *   3. INJECT model-generated body text under each matched heading, as plain
 *      (Normal-styled) paragraphs — the template's own fonts/margins/headers/
 *      footers/cover page are never touched
 *   4. GUARD: re-open the result and confirm it's still valid OOXML
 */

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// Section words we recognize even when the template doesn't use Word heading styles.
const KNOWN_SECTIONS = [
  "abstract", "introduction", "literature", "methodology", "method", "materials",
  "results", "discussion", "analysis", "conclusion", "summary", "references",
  "acknowledgement", "objectives", "scope", "background", "implementation", "future",
  "appendix", "challenges", "achievements", "reflection", "tasks", "activities",
  "skills", "organization", "technical", "contributions",
];

// Cover-page / certificate / institutional boilerplate. These are STYLED like headings
// in many college templates (Title/Heading), but they are NOT fillable content sections —
// writing body text under them pollutes the cover page and certificates.
const STRUCTURAL_BLOCKLIST =
  /\b(institute|institut|university|college|department|certificate|submitted|roll\s*no|guidance|guide|faculty|principal|head of department|hod|seal|stamp|to whom|designation|academic year|bachelor|degree|examiner|sign(ature)?|place|enrol?lment)\b/i;

export type TemplateInspection = {
  ok: boolean;
  sections: string[];
  issues: string[];
};

function paragraphText(p: Element): string {
  const texts = p.getElementsByTagName("w:t");
  let out = "";
  for (let i = 0; i < texts.length; i++) out += texts[i]!.textContent ?? "";
  return out;
}

function normalizeHeading(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/^[0-9.)\s]+/, "") // strip leading numbering like "3. "
    .replace(/[^a-z ]/g, "")
    .trim();
}

function isHeadingParagraph(p: Element): { heading: boolean; text: string } {
  const text = paragraphText(p).trim();
  if (!text || text.length > 80) return { heading: false, text };
  const styleEls = p.getElementsByTagName("w:pStyle");
  const style = styleEls.length ? (styleEls[0]!.getAttribute("w:val") ?? "") : "";
  const byStyle = /heading|title|head/i.test(style);
  const key = normalizeHeading(text);
  const byKnown = KNOWN_SECTIONS.some((k) => key === k || key.startsWith(k));
  const byChapter = /^chapter\b/.test(key);

  // Reject cover-page / certificate / institutional lines and standalone ALL-CAPS titles
  // (e.g. "INTERNSHIP REPORT") — they are styled like headings but aren't content sections.
  const isAllCaps = text === text.toUpperCase() && /[A-Z]/.test(text);
  const structural = STRUCTURAL_BLOCKLIST.test(text) || (isAllCaps && !byKnown && !byChapter);

  const heading = !structural && (byKnown || byChapter || byStyle);
  return { heading, text };
}

function loadBodyDoc(buffer: Buffer) {
  const zip = new PizZip(buffer);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("missing-document-xml");
  const dom = new DOMParser().parseFromString(file.asText().replace(/^\uFEFF/, ""), "application/xml");
  return { zip, dom };
}

/** Pre-check + heading extraction (#1.2). */
export function inspectTemplate(buffer: Buffer): TemplateInspection {
  let zip: PizZip;
  try {
    zip = new PizZip(buffer);
  } catch {
    return { ok: false, sections: [], issues: ["This isn't a readable .docx file."] };
  }
  if (zip.file("EncryptionInfo")) {
    return { ok: false, sections: [], issues: ["The document is password-protected. Remove the password and re-upload."] };
  }
  const file = zip.file("word/document.xml");
  if (!file) {
    return { ok: false, sections: [], issues: ["This isn't a valid Word document."] };
  }

  const dom = new DOMParser().parseFromString(file.asText().replace(/^\uFEFF/, ""), "application/xml");
  const paras = dom.getElementsByTagName("w:p");
  const sections: string[] = [];
  for (let i = 0; i < paras.length; i++) {
    const { heading, text } = isHeadingParagraph(paras[i]!);
    if (heading) sections.push(text);
  }

  const issues: string[] = [];
  if (sections.length < 2) {
    issues.push(
      "We couldn't find clear section headings (e.g. Introduction, Methodology). Use Word's Heading styles for your section titles, then re-upload.",
    );
  }
  return { ok: issues.length === 0, sections, issues };
}

/** A truly-empty placeholder paragraph (no text, image, or page break) — safe to drop. */
function isRemovableBlank(node: Node): boolean {
  if (node.nodeType !== 1) return false;
  const e = node as unknown as Element;
  if (e.tagName !== "w:p") return false;
  if (paragraphText(e).trim() !== "") return false;
  if (e.getElementsByTagName("w:drawing").length || e.getElementsByTagName("w:pict").length || e.getElementsByTagName("w:object").length) return false;
  const brs = e.getElementsByTagName("w:br");
  for (let i = 0; i < brs.length; i++) {
    if (brs[i]!.getAttribute("w:type") === "page") return false; // keep page breaks
  }
  return true;
}

/**
 * Collapse runs of `threshold`+ consecutive removable-blank paragraphs (direct body children)
 * down to `keep`, eliminating reserved-TOC / blank-page filler. Small runs (cover-page vertical
 * spacing) are left alone; page breaks and images are never removed.
 */
function collapseBlankRuns(body: Element, threshold: number, keep: number): void {
  const kids = Array.from({ length: body.childNodes.length }, (_, i) => body.childNodes[i]!);
  let run: Node[] = [];
  const flush = () => {
    if (run.length >= threshold) {
      for (const n of run.slice(keep)) body.removeChild(n);
    }
    run = [];
  };
  for (const node of kids) {
    if (isRemovableBlank(node)) run.push(node);
    else flush();
  }
  flush();
}

// A4 portrait in twips (210mm × 297mm) — the standard sheet for Indian college reports.
const A4_W = "11906";
const A4_H = "16838";

/**
 * Force every section's page size to A4 portrait and give every section the SAME margins, so the
 * document is uniformly A4 end-to-end. Without this, a template that mixes page sizes (or an odd
 * landscape/Letter section) renders as "some pages A4, some not" and is painful to fix by hand.
 */
function enforceA4Layout(dom: ReturnType<typeof loadBodyDoc>["dom"]): void {
  const szs = dom.getElementsByTagName("w:pgSz");
  for (let i = 0; i < szs.length; i++) {
    const s = szs[i]!;
    s.setAttribute("w:w", A4_W);
    s.setAttribute("w:h", A4_H);
    if (s.getAttribute("w:orient")) s.setAttribute("w:orient", "portrait"); // never landscape
  }
  // Unify margins across sections to the first section's values (all pages get the same text area).
  const mars = dom.getElementsByTagName("w:pgMar");
  if (mars.length > 1) {
    const attrs = ["w:top", "w:right", "w:bottom", "w:left", "w:header", "w:footer", "w:gutter"];
    const first = mars[0]!;
    const vals = attrs.map((a) => [a, first.getAttribute(a)] as const);
    for (let i = 1; i < mars.length; i++) {
      for (const [a, v] of vals) if (v != null) mars[i]!.setAttribute(a, v);
    }
  }
}

export type FillResult = { buffer: Buffer; filled: string[]; missed: string[]; placeholdersFilled: number };

/** Known field keys whose values can fill inline cover/certificate placeholders. */
export type PlaceholderFields = Partial<Record<
  "name" | "company" | "role" | "duration" | "mentor" | "technologies" | "prn" |
  "department" | "college" | "semester" | "guide" | "objective" | "teammates" | "tools" | "apparatus" | "method",
  string
>>;

// Words a template might use to label each field. Used to recognize placeholders.
const FIELD_SYNONYMS: Record<string, string[]> = {
  name: ["student name", "name of student", "name of the student", "candidate name", "candidate", "your name", "student"],
  company: ["company", "organisation", "organization", "name of company", "name of the company", "name of organisation", "name of organization", "firm", "employer", "industry name"],
  role: ["role", "designation", "position", "job title", "profile"],
  duration: ["duration", "internship duration", "internship period", "period of internship", "period"],
  mentor: ["mentor", "guide", "supervisor", "industry mentor", "external guide", "internal guide", "project guide"],
  technologies: ["technologies", "tools and technologies", "tech stack", "technology used", "technologies used"],
  prn: ["prn", "prn no", "prn number", "roll no", "roll number", "roll", "enrolment no", "enrollment no", "registration no", "registration number", "seat no"],
  department: ["department", "branch", "dept"],
  college: ["college", "institute", "institution", "university", "name of institute", "name of college"],
  semester: ["semester", "sem"],
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a global, case-insensitive replacer for one field value across all its placeholder forms. */
function fieldReplacer(synonyms: string[], value: string): (text: string) => string {
  const syn = synonyms.map(escapeRe).join("|");
  const patterns: RegExp[] = [
    // Delimited placeholders: [company], {company}, {{company}}, <company>
    new RegExp(`[\\[{<]{1,2}\\s*(?:${syn})\\s*[\\]}>]{1,2}`, "gi"),
    // "Enter (the) (name of) company"
    new RegExp(`enter\\s+(?:the\\s+)?(?:name\\s+of\\s+(?:the\\s+)?)?(?:${syn})`, "gi"),
  ];
  // Label followed by a blank: "Company : ____" / "PRN No. ........" → keep label, fill blank.
  const labelBlank = new RegExp(`((?:${syn}))(\\s*[:\\-.]\\s*)(?:_{2,}|\\.{3,}|—{2,}|\\[\\s*\\])`, "gi");
  return (text: string) => {
    let out = text;
    for (const re of patterns) out = out.replace(re, value);
    out = out.replace(labelBlank, (_m, label: string, sep: string) => `${label}${sep}${value}`);
    return out;
  };
}

/**
 * Fill inline cover-page / certificate placeholders ("Enter name of company", "[PRN]",
 * "Mr. XYZ", "Name: ____") with the student's real values — the piece the heading-based
 * injector can't reach. Conservative by design: only paragraphs whose text actually changes
 * are rewritten, and paragraphs containing images/objects are left untouched.
 */
function fillPlaceholders(dom: ReturnType<typeof loadBodyDoc>["dom"], fields: PlaceholderFields): number {
  const replacers: ((t: string) => string)[] = [];
  for (const [key, syns] of Object.entries(FIELD_SYNONYMS)) {
    const value = fields[key as keyof PlaceholderFields]?.trim();
    if (value) replacers.push(fieldReplacer(syns, value));
  }

  // Context-aware token rules. Templates often reuse the SAME dummy token ("XYZ") for the
  // student, the company AND the mentor — so we disambiguate by the surrounding label and
  // apply company/mentor BEFORE the generic "Mr. XYZ → student name" rule.
  const company = fields.company?.trim();
  const mentor = fields.mentor?.trim();
  const name = fields.name?.trim();
  const prn = fields.prn?.trim();
  const duration = fields.duration?.trim();
  // Company: "Name of company/Institute XYZ" (token may be glued to the next word).
  if (company) replacers.push((t) => t.replace(/((?:company|institute|organisation|organization)[\w/ .&]{0,25}?)XYZ/gi, `$1${company}`));
  // Mentor (compound honorific like "Mr./Dr. XYZ" denotes faculty, NOT the student) — do this
  // BEFORE the single-honorific student rule so the student's name never lands in the mentor slot.
  if (mentor) replacers.push((t) => t.replace(/(?:Mr|Dr|Ms|Mrs)\.?\s*\/\s*(?:Dr|Mr|Ms|Mrs)\.?\s+XYZ/gi, mentor));
  // Mentor: "XYZ … Mentor/Guide/Supervisor".
  if (mentor) replacers.push((t) => t.replace(/XYZ(?=[\w\s./-]{0,30}(?:mentor|guide|supervisor))/gi, mentor));
  // Student: a SINGLE honorific ("Mr. XYZ") — slash-compound honorifics are excluded above.
  if (name) replacers.push((t) => t.replace(/((?:Mr|Ms|Mrs|Shri|Smt|Miss)\.?\s+)XYZ/gi, `$1${name}`));
  if (prn) replacers.push((t) => t.replace(/((?:PRN|Roll|Enrol?lment|Registration|Seat)\s*(?:No\.?|Number)?\s*[:\-.]?\s*)\d{5,}/gi, `$1${prn}`));
  if (duration) replacers.push((t) => t.replace(/((?:Period of Internship|Internship Period|Duration)[^\d]{0,15})\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s*(?:to|–|-)\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/gi, `$1${duration}`));
  if (replacers.length === 0) return 0;
  const applyAll = (s: string): string => { let o = s; for (const r of replacers) o = r(o); return o; };
  const setText = (t: Element, s: string) => {
    while (t.firstChild) t.removeChild(t.firstChild);
    t.setAttribute("xml:space", "preserve");
    if (s.length) t.appendChild(dom.createTextNode(s) as unknown as Node);
  };

  let count = 0;
  const paras = dom.getElementsByTagName("w:p");
  for (let i = 0; i < paras.length; i++) {
    const p = paras[i]!;
    if (p.getElementsByTagName("w:drawing").length || p.getElementsByTagName("w:pict").length || p.getElementsByTagName("w:object").length) continue;
    const texts = p.getElementsByTagName("w:t");
    if (texts.length === 0) continue;
    const nodes = Array.from({ length: texts.length }, (_, k) => texts[k]!);
    const originals = nodes.map((t) => t.textContent ?? "");
    const original = originals.join("");
    if (!original.trim()) continue;
    const target = applyAll(original);
    if (target === original) continue;

    // Preferred path: replace within each run independently so every run KEEPS its own
    // formatting (bold/size/centre on cover & certificate lines is never flattened). This works
    // whenever no placeholder straddles a run boundary.
    const perNode = originals.map((s) => applyAll(s));
    if (perNode.join("") === target) {
      perNode.forEach((s, j) => { if (s !== originals[j]) setText(nodes[j]!, s); });
      count++;
      continue;
    }

    // Fallback (placeholder spans multiple runs): collapse text into the first run. Used rarely,
    // only when per-run replacement can't reconstruct the result.
    setText(nodes[0]!, target);
    for (let j = 1; j < nodes.length; j++) setText(nodes[j]!, "");
    count++;
  }
  return count;
}

/** Inject content under matched headings, preserving the template (#1.3 + #1.4). */
export function fillTemplate(
  buffer: Buffer,
  contentByHeading: Record<string, string>,
  fields: PlaceholderFields = {},
): FillResult {
  const { zip, dom } = loadBodyDoc(buffer);
  const body = dom.getElementsByTagName("w:body")[0];
  if (!body) throw new Error("missing-body");

  // First fill inline cover/certificate placeholders, then inject the section bodies.
  const placeholdersFilled = fillPlaceholders(dom, fields);

  const contentMap = new Map<string, string>();
  for (const [h, c] of Object.entries(contentByHeading)) contentMap.set(normalizeHeading(h), c);

  const paras = Array.from({ length: dom.getElementsByTagName("w:p").length }, (_, i) =>
    dom.getElementsByTagName("w:p")[i]!,
  );
  // Match the template's own body formatting (alignment/indent/font) so injected text
  // doesn't fall back to bare left-aligned defaults.
  const bodyFormat = deriveBodyFormat(paras);
  const used = new Set<string>();
  const filled: string[] = [];

  for (const p of paras) {
    const { heading, text } = isHeadingParagraph(p);
    if (!heading) continue;
    const key = normalizeHeading(text);
    let matchKey: string | undefined;
    for (const ck of contentMap.keys()) {
      if (used.has(ck)) continue;
      if (key === ck || key.startsWith(ck) || ck.startsWith(key)) {
        matchKey = ck;
        break;
      }
    }
    if (!matchKey) continue;

    used.add(matchKey);
    filled.push(text);

    // Remove the template's reserved EMPTY placeholder paragraphs right after this heading
    // (the blank space kept for content) so injected text doesn't leave huge gaps. Page breaks,
    // images and any text are preserved.
    const parent = p.parentNode as unknown as Node;
    let n = p.nextSibling as unknown as Node | null;
    while (n && isRemovableBlank(n)) {
      const next = n.nextSibling as unknown as Node | null;
      parent.removeChild(n);
      n = next;
    }

    const newParas = buildParagraphs(dom, contentMap.get(matchKey)!, bodyFormat);
    const anchor = p.nextSibling; // insert all new paragraphs right after the heading
    for (const np of newParas) parent.insertBefore(np as unknown as Node, anchor as unknown as Node);
  }

  const missed = [...contentMap.keys()].filter((k) => !used.has(k));

  // Collapse big gaps of blank paragraphs (reserved TOC / blank-page filler) that show up as
  // empty pages. Only large runs are touched (≥8) so intentional cover-page spacing (small runs)
  // is preserved; page breaks and images are never removed.
  collapseBlankRuns(body, 8, 1);

  // Enforce a single, consistent A4 portrait page setup + uniform margins on every section, so the
  // whole document is one page size (no "some pages A4, some not") and content reflows page-to-page
  // exactly like a normal Word document.
  enforceA4Layout(dom);

  const outXml = new XMLSerializer().serializeToString(dom);
  zip.file("word/document.xml", outXml);
  const out = zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;

  // Integrity guard — the output must still be valid OOXML.
  try {
    const check = new PizZip(out);
    const txt = check.file("word/document.xml")!.asText();
    const reparsed = new DOMParser().parseFromString(txt.replace(/^\uFEFF/, ""), "application/xml");
    if (!reparsed.getElementsByTagName("w:body").length) throw new Error("no-body");
  } catch {
    throw new Error("Template fill produced an invalid document — aborting to avoid a broken file.");
  }

  return { buffer: out, filled, missed, placeholdersFilled };
}

type BodyFormat = { pPr?: Element; rPr?: Element };

/** Helper: the direct-child element of `parent` with the given tag, if any. */
function directChild(parent: Element, tag: string): Element | undefined {
  const els = parent.getElementsByTagName(tag);
  for (let i = 0; i < els.length; i++) {
    if (els[i]!.parentNode === (parent as unknown as Node)) return els[i]!;
  }
  return undefined;
}

/**
 * Find a representative BODY paragraph in the template and clone its paragraph properties
 * (alignment/indent/spacing) and run properties (font/size), so injected content inherits
 * the template's real body style instead of bare defaults. Numbering is stripped.
 */
function deriveBodyFormat(paras: Element[]): BodyFormat {
  for (const p of paras) {
    const text = paragraphText(p).trim();
    if (text.length < 40 || STRUCTURAL_BLOCKLIST.test(text)) continue; // want a real body paragraph
    const pPrSrc = directChild(p, "w:pPr");
    // Skip heading/title-styled paragraphs — we want plain body formatting.
    const styleEl = pPrSrc ? directChild(pPrSrc, "w:pStyle") : undefined;
    if (/heading|title|head/i.test(styleEl?.getAttribute("w:val") ?? "")) continue;
    let pPr: Element | undefined;
    if (pPrSrc) {
      pPr = pPrSrc.cloneNode(true) as unknown as Element;
      const numPr = directChild(pPr, "w:numPr"); // don't inherit list numbering
      if (numPr) pPr.removeChild(numPr as unknown as Node);
    }
    const firstRun = directChild(p, "w:r");
    const rPrSrc = firstRun ? directChild(firstRun, "w:rPr") : undefined;
    const rPr = rPrSrc ? (rPrSrc.cloneNode(true) as unknown as Element) : undefined;
    if (pPr || rPr) return { pPr, rPr };
  }
  return {};
}

const BULLET_RE = /^\s*[-*•·]\s+/;
const NUM_RE = /^\s*\d+[.)]\s+/;
const HEADING_RE = /^\s*(#{2,4})\s+(.*\S)\s*$/; // "## Sub-heading"
const CENTER_RE = /^\s*\[center\]([\s\S]*?)\[\/center\]\s*$/i; // "[center]Fig. 1: ...[/center]"
const TABLE_ROW_RE = /^\s*\|(.+)\|\s*$/; // "| a | b |"
const TABLE_SEP_RE = /^\s*\|?[\s:|-]+\|?\s*$/; // "| --- | --- |"
const FENCE_RE = /^\s*```/; // ``` or ```lang code-block fence
const HR_RE = /^\s*([-*_])\1{2,}\s*$/; // a markdown horizontal rule: ---, ***, ___

type InlineToken = { text: string; bold: boolean; italic: boolean };

/** Parse a subset of inline markdown into bold/italic runs. Only asterisks are markers
 *  (underscores are left alone so identifiers like file_name aren't mangled). */
function parseInline(text: string): InlineToken[] {
  const out: InlineToken[] = [];
  const re = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), bold: false, italic: false });
    const tok = m[0];
    if (tok.startsWith("***")) out.push({ text: tok.slice(3, -3), bold: true, italic: true });
    else if (tok.startsWith("**")) out.push({ text: tok.slice(2, -2), bold: true, italic: false });
    else out.push({ text: tok.slice(1, -1), bold: false, italic: true });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ text: text.slice(last), bold: false, italic: false });
  return out.length ? out : [{ text, bold: false, italic: false }];
}

/**
 * Build block-level elements (<w:p> and <w:tbl>) from lightweight-markdown text, carrying
 * the template's body format and layering formatting on top of it:
 *  - blank lines split paragraphs (empty blocks are dropped — no stray blank lines)
 *  - "## " / "### " lines become bold sub-headings
 *  - "[center]…[/center]" lines are centered (figure/table captions, etc.)
 *  - "- " / "* " / "• " lines become real bullet paragraphs (glyph + hanging indent)
 *  - "1. " lines keep their numbering as a hanging-indented paragraph
 *  - "| a | b |" blocks become real bordered tables (first row = bold header)
 *  - **bold** / *italic* / ***both*** render as inline runs
 */
function buildParagraphs(dom: ReturnType<typeof loadBodyDoc>["dom"], content: string, fmt: BodyFormat = {}): Element[] {
  const el = (name: string) => dom.createElementNS(W_NS, name) as unknown as Element;
  const out: Element[] = [];

  // Paragraph properties: clone the template's body style; for list items swap justification
  // for a hanging indent so wrapped lines line up under the text. `align` overrides justification.
  const makePPr = (opts: { list?: boolean; align?: "center"; heading?: boolean } = {}): Element => {
    const pPr = fmt.pPr ? (fmt.pPr.cloneNode(true) as unknown as Element) : el("w:pPr");
    const dropJc = () => { const jc = directChild(pPr, "w:jc"); if (jc) pPr.removeChild(jc as unknown as Node); };
    const setJc = (val: string) => { dropJc(); const jc = el("w:jc"); jc.setAttribute("w:val", val); pPr.appendChild(jc as unknown as Node); };

    if (opts.list) {
      dropJc();
      const ind = el("w:ind");
      ind.setAttribute("w:left", "426");
      ind.setAttribute("w:hanging", "284");
      pPr.appendChild(ind as unknown as Node);
    } else if (opts.align === "center") {
      setJc("center");
    } else if (opts.heading) {
      setJc("left"); // sub-headings read better left-aligned
      const sp = el("w:spacing");
      sp.setAttribute("w:before", "160");
      sp.setAttribute("w:after", "60");
      pPr.appendChild(sp as unknown as Node);
    } else if (!directChild(pPr, "w:jc")) {
      // Body text: justify if the template didn't already specify an alignment.
      setJc("both");
    }
    return pPr;
  };

  const textEl = (s: string): Element => {
    const t = el("w:t");
    t.setAttribute("xml:space", "preserve");
    t.appendChild(dom.createTextNode(s) as unknown as Node);
    return t;
  };

  // A run carrying the template's font (rPr), with optional bold/italic layered on top.
  const run = (token: InlineToken, force?: { bold?: boolean }): Element => {
    const r = el("w:r");
    const rPr = fmt.rPr ? (fmt.rPr.cloneNode(true) as unknown as Element) : el("w:rPr");
    const bold = token.bold || force?.bold;
    if (bold && !directChild(rPr, "w:b")) rPr.appendChild(el("w:b") as unknown as Node);
    if (token.italic && !directChild(rPr, "w:i")) rPr.appendChild(el("w:i") as unknown as Node);
    if (rPr.childNodes.length || fmt.rPr) r.appendChild(rPr as unknown as Node);
    r.appendChild(textEl(token.text) as unknown as Node);
    return r;
  };

  // A paragraph: pPr + an optional bullet/number glyph run, then inline-formatted runs.
  const para = (
    line: string,
    opts: { list?: boolean; bullet?: string; align?: "center"; heading?: boolean } = {},
  ): Element => {
    const p = el("w:p");
    p.appendChild(makePPr(opts) as unknown as Node);
    if (opts.bullet) {
      const r = el("w:r");
      if (fmt.rPr) r.appendChild(fmt.rPr.cloneNode(true) as unknown as Node);
      r.appendChild(textEl(opts.bullet) as unknown as Node);
      r.appendChild(el("w:tab") as unknown as Node);
      p.appendChild(r as unknown as Node);
    }
    for (const tok of parseInline(line)) p.appendChild(run(tok, { bold: opts.heading }) as unknown as Node);
    return p;
  };

  // A monospace code line (no inline-markdown parsing, spaces preserved, left-aligned) so code
  // and any unavoidable ASCII art at least align in a fixed-width font instead of collapsing.
  const codePara = (line: string): Element => {
    const p = el("w:p");
    const pPr = el("w:pPr");
    const jc = el("w:jc");
    jc.setAttribute("w:val", "left");
    pPr.appendChild(jc as unknown as Node);
    p.appendChild(pPr as unknown as Node);
    const r = el("w:r");
    const rPr = el("w:rPr");
    const fonts = el("w:rFonts");
    fonts.setAttribute("w:ascii", "Consolas");
    fonts.setAttribute("w:hAnsi", "Consolas");
    fonts.setAttribute("w:cs", "Consolas");
    rPr.appendChild(fonts as unknown as Node);
    const sz = el("w:sz");
    sz.setAttribute("w:val", "18"); // 9pt — keeps wide code/diagrams from wrapping as much
    rPr.appendChild(sz as unknown as Node);
    r.appendChild(rPr as unknown as Node);
    r.appendChild(textEl(line.length ? line : " ") as unknown as Node);
    p.appendChild(r as unknown as Node);
    return p;
  };

  // ---- Table builder: "| a | b |" rows → a real bordered <w:tbl>. ----
  const cell = (text: string, header: boolean, widthDxa: number): Element => {
    const tc = el("w:tc");
    const tcPr = el("w:tcPr");
    const tcW = el("w:tcW");
    tcW.setAttribute("w:w", String(widthDxa));
    tcW.setAttribute("w:type", "dxa");
    tcPr.appendChild(tcW as unknown as Node);
    tc.appendChild(tcPr as unknown as Node);
    const p = el("w:p");
    for (const tok of parseInline(text.trim())) p.appendChild(run(tok, { bold: header }) as unknown as Node);
    tc.appendChild(p as unknown as Node);
    return tc;
  };
  const buildTable = (rows: string[][]): Element => {
    const tbl = el("w:tbl");
    const tblPr = el("w:tblPr");
    const tblW = el("w:tblW");
    tblW.setAttribute("w:w", "0");
    tblW.setAttribute("w:type", "auto");
    tblPr.appendChild(tblW as unknown as Node);
    // Explicit single borders so the table renders with gridlines on any template.
    const borders = el("w:tblBorders");
    for (const side of ["top", "left", "bottom", "right", "insideH", "insideV"]) {
      const b = el(`w:${side}`);
      b.setAttribute("w:val", "single");
      b.setAttribute("w:sz", "4");
      b.setAttribute("w:space", "0");
      b.setAttribute("w:color", "auto");
      borders.appendChild(b as unknown as Node);
    }
    tblPr.appendChild(borders as unknown as Node);
    tbl.appendChild(tblPr as unknown as Node);

    const ncols = Math.max(...rows.map((r) => r.length));
    // Keep the whole table within the A4 text area (≈9026 twips after 1" margins) so it never
    // spills past the right margin.
    const colW = Math.floor(9000 / ncols);
    const grid = el("w:tblGrid");
    for (let i = 0; i < ncols; i++) {
      const gc = el("w:gridCol");
      gc.setAttribute("w:w", String(colW));
      grid.appendChild(gc as unknown as Node);
    }
    tbl.appendChild(grid as unknown as Node);

    rows.forEach((cells, ri) => {
      const tr = el("w:tr");
      for (let ci = 0; ci < ncols; ci++) tr.appendChild(cell(cells[ci] ?? "", ri === 0, colW) as unknown as Node);
      tbl.appendChild(tr as unknown as Node);
    });
    return tbl;
  };

  // ---- Line-based pass: classify each line and emit the matching block. ----
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i]!;
    const line = raw.trim();
    if (!line) { i++; continue; } // blank → no stray paragraph

    // Horizontal rule ("---", "***", "___") — drop it (renders as a stray dashes line otherwise).
    if (HR_RE.test(raw)) { i++; continue; }

    // Fenced code block: ``` … ``` → monospace lines, fence markers stripped.
    if (FENCE_RE.test(raw)) {
      i++; // skip opening fence (and any language label on it)
      while (i < lines.length && !FENCE_RE.test(lines[i]!)) { out.push(codePara(lines[i]!)); i++; }
      i++; // skip closing fence
      continue;
    }

    // Table: a "| … |" header row immediately followed by a "|---|---|" separator row.
    if (TABLE_ROW_RE.test(raw) && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1]!)) {
      const rows: string[][] = [];
      while (i < lines.length && TABLE_ROW_RE.test(lines[i]!)) {
        if (!TABLE_SEP_RE.test(lines[i]!)) {
          const body = lines[i]!.trim().replace(/^\||\|$/g, "");
          rows.push(body.split("|").map((c) => c.trim()));
        }
        i++;
      }
      if (rows.length) {
        out.push(buildTable(rows));
        out.push(el("w:p")); // Word requires a paragraph after a table (and between adjacent tables).
      }
      continue;
    }

    const heading = HEADING_RE.exec(raw);
    if (heading) { out.push(para(heading[2]!, { heading: true })); i++; continue; }

    const center = CENTER_RE.exec(raw);
    if (center) { out.push(para(center[1]!.trim(), { align: "center" })); i++; continue; }

    if (BULLET_RE.test(raw)) { out.push(para(raw.replace(BULLET_RE, ""), { list: true, bullet: "•" })); i++; continue; }
    if (NUM_RE.test(raw)) { const m = raw.match(NUM_RE)![0]; out.push(para(raw.slice(m.length).trim(), { list: true, bullet: m.trim() })); i++; continue; }

    out.push(para(line));
    i++;
  }
  return out;
}
