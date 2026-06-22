import PizZip from "pizzip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

/**
 * Shared low-level OOXML (.pptx) DOM helpers used by the clone, structure-detection, and
 * fill-in-place engines. @xmldom exposes no DOM lib in scope, so we model the structural node
 * surface we actually touch.
 */
export interface NodeListLike {
  length: number;
  item(i: number): El | null;
}
export interface El {
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
export interface Doc extends El {
  createElement(tag: string): El;
}

/** Materialize a live NodeList into a stable array (so mutation during iteration is safe). */
export function arr(list: NodeListLike): El[] {
  const out: El[] = [];
  for (let i = 0; i < list.length; i++) {
    const n = list.item(i);
    if (n) out.push(n);
  }
  return out;
}

export const parse = (xml: string): Doc =>
  new DOMParser().parseFromString(xml.replace(/^﻿/, ""), "application/xml") as unknown as Doc;
export const serialize = (node: El): string => new XMLSerializer().serializeToString(node as never);

export type PhKind = "title" | "subtitle" | "body" | "other";

/** Classify a `p:sp` shape by its placeholder type (title / subtitle / body / other). */
export function phKindOf(sp: El): PhKind {
  const phs = sp.getElementsByTagName("p:ph");
  if (phs.length === 0) return "other";
  const type = phs.item(0)!.getAttribute("type");
  if (type === "title" || type === "ctrTitle") return "title";
  if (type === "subTitle") return "subtitle";
  if (type === "body" || type === "obj" || !type) return "body"; // untyped placeholder = body
  return "other";
}

/** Total visible text length of a shape (used to pick the "main" body placeholder). */
export function shapeTextLen(sp: El): number {
  return arr(sp.getElementsByTagName("a:t")).reduce((n, t) => n + (t.textContent?.length ?? 0), 0);
}

/** Concatenated text of all `a:t` runs under a node (shape, cell, paragraph). */
export function nodeText(node: El): string {
  return arr(node.getElementsByTagName("a:t"))
    .map((t) => t.textContent ?? "")
    .join("");
}

/**
 * Set a shape's text: one paragraph per line, cloning the shape's first paragraph so the
 * template's run formatting (font, size, color, bullet) is preserved. Works for any element that
 * holds an `a:txBody` — `p:sp` shapes AND `a:tc` table cells.
 */
export function setTxBodyText(holder: El, lines: string[]): boolean {
  const bodies = holder.getElementsByTagName("a:txBody");
  if (bodies.length === 0) {
    // `p:sp` uses `p:txBody`; table cells use `a:txBody`.
    const pBodies = holder.getElementsByTagName("p:txBody");
    if (pBodies.length === 0) return false;
    return fillTxBody(pBodies.item(0)!, lines);
  }
  return fillTxBody(bodies.item(0)!, lines);
}

function fillTxBody(txBody: El, lines: string[]): boolean {
  const paras = arr(txBody.getElementsByTagName("a:p")).filter((p) => p.parentNode === txBody);
  if (paras.length === 0) return false;
  const template = paras[0]!;

  const built = (lines.length ? lines : [""]).map((line) => {
    const p = template.cloneNode(true) as El;
    const runs = arr(p.getElementsByTagName("a:r")).filter((r) => r.parentNode === p);
    if (runs.length === 0) return p; // keep as-is (rare); avoids breaking structure
    // First run carries the text; drop the rest so we don't duplicate sample text.
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

const SLIDE_REL_SUFFIX = "/slide";

/** Ordered list of slide part names from presentation.xml + its rels. */
export function slidePartOrder(zip: PizZip): string[] {
  const presXml = zip.file("ppt/presentation.xml")?.asText();
  const relsXml = zip.file("ppt/_rels/presentation.xml.rels")?.asText();
  if (!presXml || !relsXml) return [];
  const pres = parse(presXml);
  const rels = parse(relsXml);
  const relTarget = new Map<string, string>();
  for (const r of arr(rels.getElementsByTagName("Relationship"))) {
    if ((r.getAttribute("Type") ?? "").endsWith(SLIDE_REL_SUFFIX)) {
      relTarget.set(r.getAttribute("Id") ?? "", r.getAttribute("Target") ?? "");
    }
  }
  const order: string[] = [];
  for (const sldId of arr(pres.getElementsByTagName("p:sldId"))) {
    const rid = sldId.getAttribute("r:id") ?? "";
    const target = relTarget.get(rid);
    if (target) order.push("ppt/" + target.replace(/^\/?ppt\//, "").replace(/^\.\.\//, ""));
  }
  return order;
}
