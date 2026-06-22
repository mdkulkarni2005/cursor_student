import PizZip from "pizzip";
import { DOMParser } from "@xmldom/xmldom";
import { ResumeSchema, type Resume } from "./resume";

/**
 * Deterministic (no-AI) resume parser. Extracts structured Resume data from an uploaded
 * .docx (structure-aware: paragraphs, list items, and 2-col tables) or from plain text
 * pulled out of a .pdf. It only needs to be roughly right — the user fixes the rest in the
 * editor, then it re-renders into the locked house format. Best-effort by design.
 */

// --- Intermediate line representation ---
type PLine = {
  text: string;
  bold: boolean;
  size: number; // half-points; 0 when unknown (pdf)
  list: boolean; // a bullet / list item
  right?: string; // right-cell text for 2-col table rows (org‖date, role‖location)
};

// --- Section heading dictionary (anchored; projects checked before experience) ---
const SECTION_RE: { key: Section; re: RegExp }[] = [
  { key: "summary", re: /^(professional\s+summary|summary|objective|profile|about)\b/i },
  { key: "skills", re: /^(technical\s+skills|skills|technologies|core\s+competencies)\b/i },
  { key: "education", re: /^(education|academics?|academic\s+background)\b/i },
  { key: "projects", re: /^projects?\b/i },
  { key: "experience", re: /^(work\s+|professional\s+)?experience\b|^employment\b|^internships?\b/i },
];
type Section = "summary" | "skills" | "experience" | "projects" | "education";

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(\+?\d[\d\s()-]{7,}\d)/;
const LINKEDIN_RE = /linkedin\.com\/[^\s|]+/i;
const GITHUB_RE = /github\.com\/[^\s|]+/i;
const URL_RE = /https?:\/\/[^\s|)]+/i;
const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATE_TOKEN = `(?:${MONTH}\\s*)?\\d{4}|present|current|ongoing`;
const DATE_RANGE_RE = new RegExp(`(${DATE_TOKEN})\\s*(?:[-–—]|to)\\s*(${DATE_TOKEN})`, "i");
const SINGLE_DATE_RE = new RegExp(`^(?:${MONTH}\\s*)?\\d{4}$`, "i");

function sectionOf(text: string): Section | null {
  const t = text.trim();
  if (!t || t.length > 48) return null;
  for (const { key, re } of SECTION_RE) if (re.test(t)) return key;
  return null;
}

function hasDate(s?: string): boolean {
  if (!s) return false;
  return DATE_RANGE_RE.test(s) || SINGLE_DATE_RE.test(s.trim());
}

function parseDates(s?: string): { start?: string; end?: string } | undefined {
  if (!s) return undefined;
  const m = DATE_RANGE_RE.exec(s);
  if (m) return { start: m[1]?.trim(), end: m[2]?.trim() };
  if (SINGLE_DATE_RE.test(s.trim())) return { start: s.trim() };
  return undefined;
}

/** Strip an inline trailing date range from a header line, returning the leftover title. */
function stripInlineDate(text: string): { title: string; date?: string } {
  const m = DATE_RANGE_RE.exec(text);
  if (m && m.index > 0) return { title: text.slice(0, m.index).replace(/[-–—|,\s]+$/, "").trim(), date: m[0] };
  return { title: text.trim() };
}

// =================== DOCX extraction (structure-aware) ====================

// Minimal structural type for @xmldom nodes (the package has no DOM lib in scope).
type XmlNode = {
  nodeName: string;
  nodeType: number;
  textContent: string | null;
  childNodes: { length: number; item(i: number): XmlNode | null };
  getElementsByTagName(tag: string): { length: number; item(i: number): XmlNode | null };
  getAttribute(name: string): string | null;
};

function descendantText(el: XmlNode): string {
  const ts = el.getElementsByTagName("w:t");
  let s = "";
  for (let i = 0; i < ts.length; i++) s += ts.item(i)?.textContent ?? "";
  return s.replace(/\s+/g, " ").trim();
}
function maxSize(el: XmlNode): number {
  const szs = el.getElementsByTagName("w:sz");
  let max = 0;
  for (let i = 0; i < szs.length; i++) {
    const v = parseInt(szs.item(i)?.getAttribute("w:val") ?? "0", 10);
    if (v > max) max = v;
  }
  return max;
}
const isBold = (el: XmlNode) => el.getElementsByTagName("w:b").length > 0;

function linesFromDocx(buffer: Buffer): PLine[] {
  const zip = new PizZip(buffer);
  const xml = zip.file("word/document.xml")?.asText();
  if (!xml) throw new Error("This .docx has no readable document body.");
  const dom = new DOMParser().parseFromString(xml.replace(/^\uFEFF/, ""), "application/xml");
  const bodies = dom.getElementsByTagName("w:body");
  const body = bodies.item(0) as unknown as XmlNode | null;
  if (!body) throw new Error("This .docx has no body.");

  const lines: PLine[] = [];
  const children = body.childNodes;
  for (let i = 0; i < children.length; i++) {
    const node = children.item(i) as XmlNode | null;
    if (!node || node.nodeType !== 1) continue;
    const name = node.nodeName;
    if (name === "w:p") {
      const text = descendantText(node);
      if (!text) continue;
      lines.push({
        text,
        bold: isBold(node),
        size: maxSize(node),
        list: node.getElementsByTagName("w:numPr").length > 0,
      });
    } else if (name === "w:tbl") {
      const rows = node.getElementsByTagName("w:tr");
      for (let r = 0; r < rows.length; r++) {
        const row = rows.item(r)!;
        const cells = row.getElementsByTagName("w:tc");
        if (cells.length === 0) continue;
        const leftEl = cells.item(0)!;
        const left = descendantText(leftEl);
        const right = cells.length > 1 ? descendantText(cells.item(cells.length - 1)!) : undefined;
        if (!left && !right) continue;
        lines.push({ text: left, right: right || undefined, bold: isBold(leftEl), size: maxSize(leftEl), list: false });
      }
    }
  }
  return lines;
}

// =================== PDF / plain text → lines ====================

function linesFromText(text: string): PLine[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((raw) => {
      const list = /^[•▪◦‣·*]\s+|^[-–]\s+/.test(raw);
      return { text: raw.replace(/^[•▪◦‣·*\-–]\s+/, "").trim(), bold: false, size: 0, list };
    });
}

// =================== Shared section parser ====================

function splitSections(lines: PLine[]): { contact: PLine[]; sections: Record<Section, PLine[]> } {
  const sections: Record<Section, PLine[]> = { summary: [], skills: [], experience: [], projects: [], education: [] };
  const contact: PLine[] = [];
  let current: Section | null = null;
  for (const line of lines) {
    const h = sectionOf(line.text);
    if (h) {
      current = h;
      continue;
    }
    if (current) sections[current].push(line);
    else contact.push(line);
  }
  return { contact, sections };
}

function parseContact(lines: PLine[]): Resume["contact"] {
  const joined = lines.map((l) => [l.text, l.right].filter(Boolean).join(" ")).join("  ");
  // Name = the largest-size line without @/digits, else the first such line, else first line.
  const candidates = lines.filter((l) => l.text && !EMAIL_RE.test(l.text) && !/\d/.test(l.text));
  const bySize = [...candidates].sort((a, b) => b.size - a.size);
  const name = (bySize[0]?.text || candidates[0]?.text || lines[0]?.text || "Your Name").trim();
  // Contact details often sit on ONE pipe-separated line — split into segments to find location.
  const segments = lines.flatMap((l) => l.text.split(/\s*[|•·]\s*/)).map((s) => s.trim()).filter(Boolean);
  const location = segments.find(
    (s) => /,/.test(s) && !EMAIL_RE.test(s) && !URL_RE.test(s) && !/linkedin|github|http/i.test(s) && !/@/.test(s) && s.length < 40,
  );
  return {
    name,
    email: EMAIL_RE.exec(joined)?.[0],
    phone: PHONE_RE.exec(joined)?.[0]?.trim(),
    location: location?.trim(),
    linkedin: LINKEDIN_RE.exec(joined)?.[0],
    github: GITHUB_RE.exec(joined)?.[0],
  };
}

function parseSkills(lines: PLine[]): Resume["skills"] {
  const groups: Resume["skills"] = [];
  for (const line of lines) {
    const idx = line.text.indexOf(":");
    if (idx > 0 && idx < 40) {
      const category = line.text.slice(0, idx).trim();
      const items = line.text.slice(idx + 1).split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      if (category && items.length) groups.push({ category, items });
    } else {
      const items = line.text.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      if (items.length) groups.push({ category: "Skills", items });
    }
  }
  return groups;
}

type RawEntry = { main: string; role?: string; location?: string; dates?: { start?: string; end?: string }; bullets: string[]; link?: string };

function parseEntries(lines: PLine[]): RawEntry[] {
  const entries: RawEntry[] = [];
  let cur: RawEntry | null = null;
  const push = () => { if (cur && cur.main) entries.push(cur); };

  for (const line of lines) {
    const headerByTable = !!line.right && hasDate(line.right) && !line.list;
    const headerByInline = !line.right && !line.list && hasDate(line.text) && !/^[•▪]/.test(line.text);
    const subHeader = !!line.right && !hasDate(line.right) && !line.list;

    if (headerByTable) {
      push();
      cur = { main: line.text.trim() || "Untitled", dates: parseDates(line.right), bullets: [] };
    } else if (headerByInline) {
      push();
      const { title, date } = stripInlineDate(line.text);
      cur = { main: title || "Untitled", dates: parseDates(date), bullets: [] };
    } else if (!cur) {
      continue;
    } else if (subHeader && !cur.role) {
      cur.role = line.text.trim() || undefined;
      cur.location = line.right?.trim();
    } else if (URL_RE.test(line.text) || /link to project/i.test(line.text)) {
      cur.link = URL_RE.exec(line.text)?.[0] ?? cur.link;
    } else if (line.list) {
      cur.bullets.push(line.text.trim());
    } else if (cur.bullets.length === 0 && !cur.role && !line.right) {
      cur.role = line.text.trim() || undefined; // role line without a table
    } else {
      cur.bullets.push(line.text.trim()); // continuation / pdf bullet without a list marker
    }
  }
  push();
  return entries;
}

function parseEducation(lines: PLine[]): Resume["education"] {
  const entries = parseEntries(lines);
  return entries.map((e) => ({
    institution: e.main,
    degree: e.role || e.bullets[0] || undefined,
    location: e.location,
    dates: e.dates,
  }));
}

function assemble(lines: PLine[]): Resume {
  const { contact, sections } = splitSections(lines);
  const raw = {
    contact: parseContact(contact),
    summary: sections.summary.map((l) => l.text).join(" ").trim() || undefined,
    skills: parseSkills(sections.skills),
    experience: parseEntries(sections.experience).map((e) => ({
      organization: e.main, role: e.role, location: e.location, dates: e.dates, bullets: e.bullets,
    })),
    projects: parseEntries(sections.projects).map((e) => ({
      name: e.main, role: e.role, location: e.location, dates: e.dates, bullets: e.bullets, link: e.link,
    })),
    education: parseEducation(sections.education),
  };
  // Validate/coerce; drops malformed entries via the schema's constraints.
  return ResumeSchema.parse(raw);
}

/** Parse a .docx resume (structure-aware) into the Resume schema. */
export function parseResumeDocx(buffer: Buffer): Resume {
  return assemble(linesFromDocx(buffer));
}

/** Parse plain text (e.g. extracted from a .pdf) into the Resume schema. */
export function parseResumeText(text: string): Resume {
  return assemble(linesFromText(text));
}
