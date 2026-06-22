import PizZip from "pizzip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

/**
 * EXACT layout cloning (#8.1). pptxgenjs can't import a .pptx, so to reproduce a user's real
 * slide design we do raw OOXML surgery: pick a representative content slide from their template,
 * `cloneNode(true)` it once per generated slide, and swap ONLY the placeholder text. Cloning
 * inherits their layout refs, masters, fonts, logos and namespaces for free.
 *
 * Because neither our headless verify nor the build env can confirm "PowerPoint opens it", every
 * produced file is run through an INTEGRITY GUARD (referential checks). The caller uses the clone
 * ONLY if the guard passes, else falls back to the known-good theme renderer.
 */

export type PptCloneContent = {
  title: string;
  subtitle: string;
  slides: { heading: string; bullets: string[] }[];
};
export type PptCloneResult = { ok: boolean; buffer?: Buffer; issues: string[] };

const SLIDE_CT_FALLBACK = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml";
const SLIDE_REL_FALLBACK = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide";

// Structural @xmldom node types (the package has no DOM lib in scope).
interface NodeListLike { length: number; item(i: number): El | null; }
interface El {
  nodeName: string;
  textContent: string | null;
  parentNode: El | null;
  childNodes: NodeListLike;
  getElementsByTagName(tag: string): NodeListLike;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  appendChild(child: El): El;
  removeChild(child: El): El;
  cloneNode(deep: boolean): El;
}
interface Doc extends El { createElement(tag: string): El; }

function arr(list: NodeListLike): El[] {
  const out: El[] = [];
  for (let i = 0; i < list.length; i++) {
    const n = list.item(i);
    if (n) out.push(n);
  }
  return out;
}
const parse = (xml: string): Doc => new DOMParser().parseFromString(xml.replace(/^\uFEFF/, ""), "application/xml") as unknown as Doc;
const serialize = (node: El): string => new XMLSerializer().serializeToString(node as never);

type PhKind = "title" | "subtitle" | "body" | "other";
function phKindOf(sp: El): PhKind {
  const phs = sp.getElementsByTagName("p:ph");
  if (phs.length === 0) return "other";
  const type = phs.item(0)!.getAttribute("type");
  if (type === "title" || type === "ctrTitle") return "title";
  if (type === "subTitle") return "subtitle";
  if (type === "body" || type === "obj" || !type) return "body"; // untyped placeholder = body
  return "other";
}
function shapeTextLen(sp: El): number {
  return arr(sp.getElementsByTagName("a:t")).reduce((n, t) => n + (t.textContent?.length ?? 0), 0);
}

/** Set a shape's text: one paragraph per line, cloning the shape's first paragraph for formatting. */
function setShapeText(sp: El, lines: string[]): boolean {
  const bodies = sp.getElementsByTagName("p:txBody");
  if (bodies.length === 0) return false;
  const txBody = bodies.item(0)!;
  const paras = arr(txBody.getElementsByTagName("a:p")).filter((p) => p.parentNode === txBody);
  if (paras.length === 0) return false;
  const template = paras[0]!;

  const built = (lines.length ? lines : [""]).map((line) => {
    const p = template.cloneNode(true) as El;
    const runs = arr(p.getElementsByTagName("a:r")).filter((r) => r.parentNode === p);
    if (runs.length === 0) return p; // keep as-is (rare); avoids breaking structure
    // First run carries the text; drop the rest so we don't duplicate.
    const first = runs[0]!;
    const ts = first.getElementsByTagName("a:t");
    if (ts.length) ts.item(0)!.textContent = line;
    for (let i = 1; i < runs.length; i++) p.removeChild(runs[i]!);
    return p;
  });

  for (const p of paras) txBody.removeChild(p);
  for (const p of built) txBody.appendChild(p);
  return true;
}

type SlideInfo = { partName: string; baseName: string; doc: ReturnType<typeof parse>; title?: El; subtitle?: El; body?: El; bodyLen: number };

function analyzeSlide(zip: PizZip, partName: string): SlideInfo | null {
  const f = zip.file(partName);
  if (!f) return null;
  const doc = parse(f.asText());
  const info: SlideInfo = { partName, baseName: partName.split("/").pop()!, doc, bodyLen: 0 };
  for (const sp of arr(doc.getElementsByTagName("p:sp"))) {
    const kind = phKindOf(sp);
    if (kind === "title" && !info.title) info.title = sp;
    else if (kind === "subtitle" && !info.subtitle) info.subtitle = sp;
    else if (kind === "body") {
      const len = shapeTextLen(sp);
      if (!info.body || len > info.bodyLen) {
        info.body = sp;
        info.bodyLen = len;
      }
    }
  }
  return info;
}

/** Ordered list of slide part names from presentation.xml + its rels. */
function slidePartOrder(zip: PizZip): string[] {
  const presXml = zip.file("ppt/presentation.xml")?.asText();
  const relsXml = zip.file("ppt/_rels/presentation.xml.rels")?.asText();
  if (!presXml || !relsXml) return [];
  const pres = parse(presXml);
  const rels = parse(relsXml);
  const relTarget = new Map<string, string>();
  for (const r of arr(rels.getElementsByTagName("Relationship"))) {
    relTarget.set(r.getAttribute("Id") ?? "", r.getAttribute("Target") ?? "");
  }
  const order: string[] = [];
  for (const sldId of arr(pres.getElementsByTagName("p:sldId"))) {
    const rid = sldId.getAttribute("r:id") ?? "";
    const target = relTarget.get(rid);
    if (target) order.push("ppt/" + target.replace(/^\/?ppt\//, "").replace(/^\.\.\//, ""));
  }
  return order;
}

export function fillPptxTemplate(templateBuffer: Buffer, content: PptCloneContent): PptCloneResult {
  let zip: PizZip;
  try {
    zip = new PizZip(templateBuffer);
  } catch {
    return { ok: false, issues: ["Unreadable .pptx."] };
  }
  if (!zip.file("ppt/presentation.xml")) return { ok: false, issues: ["Not a valid presentation."] };

  const order = slidePartOrder(zip);
  const infos = order.map((p) => analyzeSlide(zip, p)).filter((x): x is SlideInfo => !!x);
  if (infos.length === 0) return { ok: false, issues: ["No slides found in template."] };

  // Pick the content slide (title + body, most body text) and a title slide (has subtitle/title).
  const contentSrc = infos.filter((i) => i.title && i.body).sort((a, b) => b.bodyLen - a.bodyLen)[0];
  if (!contentSrc) return { ok: false, issues: ["No content slide with title + body placeholder."] };
  const titleSrc = infos.find((i) => i.subtitle && i.title) ?? contentSrc;

  // Read the EXACT slide ContentType + relationship Type from the template (don't trust memory).
  const ctXml = zip.file("[Content_Types].xml")!.asText();
  const ctDoc = parse(ctXml);
  const slideOverride = arr(ctDoc.getElementsByTagName("Override")).find((o) => (o.getAttribute("PartName") ?? "").startsWith("/ppt/slides/slide"));
  const slideCT = slideOverride?.getAttribute("ContentType") ?? SLIDE_CT_FALLBACK;

  const presRels = parse(zip.file("ppt/_rels/presentation.xml.rels")!.asText());
  const slideRel = arr(presRels.getElementsByTagName("Relationship")).find((r) => (r.getAttribute("Type") ?? "").endsWith("/slide"));
  const slideRelType = slideRel?.getAttribute("Type") ?? SLIDE_REL_FALLBACK;

  // Next free rId and sldId (sldId must be unique AND >= 256).
  let maxRid = 0;
  for (const r of arr(presRels.getElementsByTagName("Relationship"))) {
    const m = /^rId(\d+)$/.exec(r.getAttribute("Id") ?? "");
    if (m) maxRid = Math.max(maxRid, parseInt(m[1]!, 10));
  }
  const pres = parse(zip.file("ppt/presentation.xml")!.asText());
  let maxSldId = 255;
  for (const s of arr(pres.getElementsByTagName("p:sldId"))) maxSldId = Math.max(maxSldId, parseInt(s.getAttribute("id") ?? "0", 10));

  // Build the output slides: [title, ...content].
  type NewSlide = { partName: string; baseName: string; xml: string; relsXml?: string };
  const newSlides: NewSlide[] = [];
  let nameSeq = 1000;
  const makePart = (src: SlideInfo, fill: (doc: ReturnType<typeof parse>, title?: El, subtitle?: El, body?: El) => void): NewSlide => {
    const doc = parse(zip.file(src.partName)!.asText());
    // Re-find placeholders in this fresh parse.
    const re = { title: undefined as El | undefined, subtitle: undefined as El | undefined, body: undefined as El | undefined, bodyLen: -1 };
    for (const sp of arr(doc.getElementsByTagName("p:sp"))) {
      const k = phKindOf(sp);
      if (k === "title" && !re.title) re.title = sp;
      else if (k === "subtitle" && !re.subtitle) re.subtitle = sp;
      else if (k === "body") { const len = shapeTextLen(sp); if (len > re.bodyLen) { re.body = sp; re.bodyLen = len; } }
    }
    fill(doc, re.title, re.subtitle, re.body);
    const baseName = `slide${nameSeq++}.xml`;
    const partName = `ppt/slides/${baseName}`;
    const relsSrc = zip.file(`ppt/slides/_rels/${src.baseName}.rels`);
    return { partName, baseName, xml: serialize(doc), relsXml: relsSrc?.asText() };
  };

  // Title slide. (If the template has no dedicated title layout, put the subtitle into the body
  // so leftover sample bullets don't survive.)
  newSlides.push(makePart(titleSrc, (_d, title, subtitle, body) => {
    if (title) setShapeText(title, [content.title]);
    if (subtitle) setShapeText(subtitle, [content.subtitle]);
    else if (body) setShapeText(body, [content.subtitle]);
  }));
  // Content slides.
  for (const s of content.slides) {
    newSlides.push(makePart(contentSrc, (_d, title, _sub, body) => {
      if (title) setShapeText(title, [s.heading]);
      if (body) setShapeText(body, s.bullets);
    }));
  }

  // Assign rIds + sldIds in order.
  const assigned = newSlides.map((ns, i) => ({ ...ns, rid: `rId${maxRid + 1 + i}`, sldId: maxSldId + 1 + i }));

  // Write new slide parts + their _rels.
  for (const ns of assigned) {
    zip.file(ns.partName, ns.xml);
    if (ns.relsXml) zip.file(`ppt/slides/_rels/${ns.baseName}.rels`, ns.relsXml);
  }

  // [Content_Types].xml — add an Override per new slide.
  const types = ctDoc.getElementsByTagName("Types").item(0)!;
  for (const ns of assigned) {
    const o = ctDoc.createElement("Override");
    o.setAttribute("PartName", `/${ns.partName}`);
    o.setAttribute("ContentType", slideCT);
    types.appendChild(o);
  }
  zip.file("[Content_Types].xml", serialize(ctDoc));

  // presentation.xml.rels — add a Relationship per new slide.
  const relsRoot = presRels.getElementsByTagName("Relationships").item(0)!;
  for (const ns of assigned) {
    const r = presRels.createElement("Relationship");
    r.setAttribute("Id", ns.rid);
    r.setAttribute("Type", slideRelType);
    r.setAttribute("Target", `slides/${ns.baseName}`);
    relsRoot.appendChild(r);
  }
  zip.file("ppt/_rels/presentation.xml.rels", serialize(presRels));

  // presentation.xml — rebuild sldIdLst to reference ONLY our new slides.
  const sldIdLst = pres.getElementsByTagName("p:sldIdLst").item(0);
  if (!sldIdLst) return { ok: false, issues: ["No sldIdLst in presentation."] };
  for (const child of arr(sldIdLst.getElementsByTagName("p:sldId"))) sldIdLst.removeChild(child);
  for (const ns of assigned) {
    const el = pres.createElement("p:sldId");
    el.setAttribute("id", String(ns.sldId));
    el.setAttribute("r:id", ns.rid);
    sldIdLst.appendChild(el);
  }
  zip.file("ppt/presentation.xml", serialize(pres));

  const buffer = zip.generate({ type: "nodebuffer" }) as Buffer;

  // Integrity guard — must pass or the caller falls back.
  const guard = checkPptxIntegrity(buffer, [content.title, ...content.slides.map((s) => s.heading)]);
  if (!guard.ok) return { ok: false, issues: guard.issues };
  return { ok: true, buffer, issues: [] };
}

/** Referential integrity guard — catches the silent-corruption cases PowerPoint would reject. */
export function checkPptxIntegrity(buffer: Buffer, expectedTexts: string[] = []): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  let zip: PizZip;
  try {
    zip = new PizZip(buffer);
  } catch {
    return { ok: false, issues: ["Output is not a readable zip."] };
  }
  const presXml = zip.file("ppt/presentation.xml")?.asText();
  const relsXml = zip.file("ppt/_rels/presentation.xml.rels")?.asText();
  const ctXml = zip.file("[Content_Types].xml")?.asText();
  if (!presXml || !relsXml || !ctXml) return { ok: false, issues: ["Missing core parts."] };

  const pres = parse(presXml);
  const rels = parse(relsXml);
  const ct = parse(ctXml);

  const relById = new Map<string, string>();
  for (const r of arr(rels.getElementsByTagName("Relationship"))) relById.set(r.getAttribute("Id") ?? "", r.getAttribute("Target") ?? "");
  const overrides = new Set(arr(ct.getElementsByTagName("Override")).map((o) => o.getAttribute("PartName") ?? ""));

  const sldIds = arr(pres.getElementsByTagName("p:sldId"));
  if (sldIds.length === 0) issues.push("No slides referenced.");
  const seenIds = new Set<string>();
  let allText = "";
  for (const s of sldIds) {
    const id = s.getAttribute("id") ?? "";
    if (parseInt(id, 10) < 256) issues.push(`sldId ${id} < 256.`);
    if (seenIds.has(id)) issues.push(`Duplicate sldId ${id}.`);
    seenIds.add(id);
    const rid = s.getAttribute("r:id") ?? "";
    const target = relById.get(rid);
    if (!target) { issues.push(`sldId r:id ${rid} has no relationship.`); continue; }
    const partName = "/ppt/" + target.replace(/^\/?ppt\//, "").replace(/^\.\.\//, "");
    if (!overrides.has(partName)) issues.push(`No Content_Types override for ${partName}.`);
    const part = zip.file(partName.replace(/^\//, ""));
    if (!part) { issues.push(`Missing slide part ${partName}.`); continue; }
    try {
      const sdoc = parse(part.asText());
      if (sdoc.getElementsByTagName("p:sld").length === 0) issues.push(`Slide ${partName} not well-formed.`);
      allText += part.asText();
    } catch {
      issues.push(`Slide ${partName} failed to parse.`);
    }
  }
  for (const t of expectedTexts) {
    if (t && !allText.includes(t)) issues.push(`Injected text not found: "${t.slice(0, 30)}".`);
  }
  return { ok: issues.length === 0, issues };
}
