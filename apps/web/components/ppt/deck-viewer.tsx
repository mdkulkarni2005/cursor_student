"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { PptTheme, PptSlide, PptLayout, PptRun, RichText } from "@studentos/documents";
import { SlideCanvas, type CanvasSlide } from "./slide-canvas";
import { savePptDeckAction, regenerateSlideImageAction } from "@/lib/actions/ppt";

export type DeckSlide = PptSlide;
export type Deck = { title: string; subtitle: string; slides: DeckSlide[]; theme?: PptTheme };

const LAYOUTS: { value: PptLayout; label: string }[] = [
  { value: "bullets", label: "Bullets" },
  { value: "two-column", label: "Two columns" },
  { value: "table", label: "Table" },
  { value: "diagram", label: "Diagram" },
  { value: "stat", label: "Stats" },
  { value: "image", label: "Image + text" },
  { value: "quote", label: "Quote" },
  { value: "section", label: "Section divider" },
];
const RICH_LAYOUTS = new Set<PptLayout>(["bullets", "image", "two-column", "quote", "section"]);

const lines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);
const toLines = (a?: string[]) => (a ?? []).join("\n");
const plain = (r: RichText | undefined): string => (!r ? "" : typeof r === "string" ? r : r.map((x) => x.text).join(""));

// ---------- rich-text <-> DOM ----------
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function runsToHtml(r: RichText | undefined): string {
  if (!r) return "";
  if (typeof r === "string") return esc(r);
  return r.map((run) => {
    const style: string[] = [];
    if (run.b) style.push("font-weight:bold");
    if (run.i) style.push("font-style:italic");
    if (run.u) style.push("text-decoration:underline");
    if (run.color) style.push(`color:${run.color.startsWith("#") ? run.color : `#${run.color}`}`);
    if (run.face) style.push(`font-family:${run.face}`);
    if (run.size) style.push(`font-size:${run.size}pt`);
    const t = esc(run.text) || "";
    return style.length ? `<span style="${style.join(";")}">${t}</span>` : t;
  }).join("");
}
type Style = { b?: boolean; i?: boolean; u?: boolean; color?: string; face?: string; size?: number };
function domToRuns(el: HTMLElement): PptRun[] {
  const runs: PptRun[] = [];
  const walk = (node: Node, st: Style) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? "";
        if (text) runs.push({ text, ...(st.b && { b: true }), ...(st.i && { i: true }), ...(st.u && { u: true }), ...(st.color && { color: st.color }), ...(st.face && { face: st.face }), ...(st.size && { size: st.size }) });
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const e = child as HTMLElement;
      const tag = e.tagName.toLowerCase();
      const next: Style = { ...st };
      if (tag === "b" || tag === "strong") next.b = true;
      if (tag === "i" || tag === "em") next.i = true;
      if (tag === "u") next.u = true;
      if (tag === "br") { runs.push({ text: "\n" }); return; }
      const cs = e.style;
      if (cs.fontWeight === "bold" || parseInt(cs.fontWeight) >= 600) next.b = true;
      if (cs.fontStyle === "italic") next.i = true;
      if (cs.textDecoration?.includes("underline") || cs.textDecorationLine?.includes("underline")) next.u = true;
      if (cs.color) next.color = rgbToHex(cs.color);
      if (cs.fontFamily) next.face = cs.fontFamily.replace(/["']/g, "").split(",")[0]!.trim();
      if (cs.fontSize?.endsWith("px")) next.size = Math.round(parseFloat(cs.fontSize) * 0.75);
      if (cs.fontSize?.endsWith("pt")) next.size = Math.round(parseFloat(cs.fontSize));
      const colorAttr = e.getAttribute("color");
      if (colorAttr) next.color = rgbToHex(colorAttr);
      walk(e, next);
    });
  };
  walk(el, {});
  // Merge adjacent runs with identical formatting.
  const merged: PptRun[] = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && last.b === r.b && last.i === r.i && last.u === r.u && last.color === r.color && last.face === r.face && last.size === r.size) last.text += r.text;
    else merged.push({ ...r });
  }
  // Collapse a single unformatted run back to a plain string upstream (caller decides).
  return merged;
}
function rgbToHex(c: string): string {
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
  if (m) return [m[1], m[2], m[3]].map((n) => parseInt(n!).toString(16).padStart(2, "0")).join("").toUpperCase();
  return c.replace(/^#/, "").toUpperCase();
}
/** A run list that's a single unformatted span is stored as a plain string (keeps data tidy). */
function normalizeRich(runs: PptRun[]): RichText {
  if (runs.length === 0) return "";
  if (runs.length === 1 && !runs[0]!.b && !runs[0]!.i && !runs[0]!.u && !runs[0]!.color && !runs[0]!.face && !runs[0]!.size) return runs[0]!.text;
  return runs;
}

function toCanvasSlides(deck: Deck, docId: string, imgVer: number): CanvasSlide[] {
  return [
    { kind: "title", title: deck.title, subtitle: deck.subtitle },
    ...deck.slides.map((s, i) => ({
      kind: "content" as const,
      slide: s,
      imageUrl: s.image ? `/ppt/${docId}/image/${i}?v=${imgVer}` : null,
    })),
  ];
}

export function DeckViewer({ docId, deck, editable = false }: { docId: string; deck: Deck; editable?: boolean }) {
  const [title, setTitle] = useState(deck.title);
  const [subtitle, setSubtitle] = useState(deck.subtitle);
  const [slides, setSlides] = useState<DeckSlide[]>(deck.slides);
  const [active, setActive] = useState(0);
  const [editing, setEditing] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [imgVer, setImgVer] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const savedRange = useRef<Range | null>(null);

  const liveDeck: Deck = { title, subtitle, slides, theme: deck.theme };
  const canvasSlides = toCanvasSlides(liveDeck, docId, imgVer);
  const current = canvasSlides[Math.min(active, canvasSlides.length - 1)]!;
  const notes = active > 0 ? slides[active - 1]?.notes : undefined;
  const contentIdx = active - 1;

  const patchSlide = useCallback((i: number, patch: Partial<DeckSlide>) => {
    setSlides((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    setDirty(true);
  }, []);

  // ----- rich-text toolbar plumbing (mirrors report-editor.tsx) -----
  const saveSel = () => { const s = window.getSelection(); if (s && s.rangeCount) savedRange.current = s.getRangeAt(0).cloneRange(); };
  const restoreSel = () => { const s = window.getSelection(); if (savedRange.current && s) { s.removeAllRanges(); s.addRange(savedRange.current); } };
  const exec = (cmd: string, value?: string) => { restoreSel(); document.execCommand(cmd, false, value); };
  const setFontSize = (px: string) => {
    restoreSel();
    document.execCommand("fontSize", false, "7");
    document.querySelectorAll('font[size="7"]').forEach((f) => { f.removeAttribute("size"); (f as HTMLElement).style.fontSize = `${px}px`; });
  };

  function save() {
    setMsg(null);
    startSave(async () => {
      const res = await savePptDeckAction(docId, { title, subtitle, slides });
      if (res.error) setMsg(res.error);
      else { setDirty(false); setMsg("Saved ✓"); }
    });
  }
  function genImage(i: number) {
    setMsg(null);
    startSave(async () => {
      const res = await regenerateSlideImageAction(docId, i, { title, subtitle, slides });
      if (res.error) { setMsg(res.error); return; }
      patchSlide(i, { image: "stored" });
      setDirty(false); setImgVer((v) => v + 1); setMsg("Image added ✓");
    });
  }
  function addSlide() {
    const blank: DeckSlide = { layout: "bullets", heading: "New slide", bullets: ["Point one"] };
    setSlides((prev) => { const at = Math.max(0, contentIdx) + 1; return [...prev.slice(0, at), blank, ...prev.slice(at)]; });
    setActive(Math.max(1, active) + 1); setDirty(true);
  }
  function removeSlide(i: number) {
    if (slides.length <= 3) { setMsg("A deck needs at least 3 slides."); return; }
    setSlides((prev) => prev.filter((_, j) => j !== i)); setActive((a) => Math.max(0, a - 1)); setDirty(true);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir; if (j < 0 || j >= slides.length) return;
    setSlides((prev) => { const n = [...prev]; [n[i], n[j]] = [n[j]!, n[i]!]; return n; }); setActive(j + 1); setDirty(true);
  }

  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresenting(false);
      else if (e.key === "ArrowRight" || e.key === " ") setActive((a) => Math.min(canvasSlides.length - 1, a + 1));
      else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, a - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, canvasSlides.length]);

  if (presenting) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black p-6">
        <div className="w-full max-w-[1400px]"><SlideCanvas slide={current} theme={deck.theme} className="rounded-lg shadow-2xl" /></div>
        <div className="mt-4 flex items-center gap-4 text-[13px] text-white/60">
          <button onClick={() => setActive((a) => Math.max(0, a - 1))} disabled={active === 0} className="rounded-lg border border-white/20 px-3 py-1.5 disabled:opacity-30">←</button>
          <span>{active + 1} / {canvasSlides.length}</span>
          <button onClick={() => setActive((a) => Math.min(canvasSlides.length - 1, a + 1))} disabled={active === canvasSlides.length - 1} className="rounded-lg border border-white/20 px-3 py-1.5 disabled:opacity-30">→</button>
          <button onClick={() => setPresenting(false)} className="rounded-lg border border-white/20 px-3 py-1.5">Esc · Exit</button>
        </div>
      </div>
    );
  }

  const activeSlide = active > 0 ? slides[contentIdx] : undefined;
  const showToolbar = editing && (active === 0 || (activeSlide && RICH_LAYOUTS.has(activeSlide.layout ?? "bullets")));

  return (
    <div className="mt-4">
      {/* Toolbar row */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card p-2">
        <button onClick={() => setPresenting(true)} className="flex items-center gap-1.5 rounded-lg bg-cyan px-3.5 py-1.5 text-[13px] font-semibold text-on-accent transition-transform active:scale-95">▶ Present</button>
        {editable ? (
          <button onClick={() => setEditing((e) => !e)} className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${editing ? "bg-cyan/15 text-cyan" : "border border-line bg-surface text-soft hover:text-cyan"}`}>{editing ? "Done editing" : "✎ Edit"}</button>
        ) : null}
        {editing ? (
          <>
            <button onClick={addSlide} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-soft hover:text-cyan">+ Slide</button>
            <button onClick={save} disabled={saving || !dirty} className="rounded-lg border border-cyan/30 bg-cyan/5 px-4 py-1.5 text-[13px] font-semibold text-cyan disabled:opacity-40">{saving ? "Saving…" : dirty ? "Save" : "✓ Saved"}</button>
          </>
        ) : null}
        {msg ? <span className="text-[12.5px] text-faint">{msg}</span> : null}
        {!editable ? <span className="ml-auto text-[12px] text-faint">Template deck — download to edit in PowerPoint.</span> : null}
      </div>

      {/* Rich-text formatting toolbar (sticky) */}
      {showToolbar ? <RichToolbar exec={exec} setFontSize={setFontSize} /> : null}

      <div className="flex gap-5">
        {/* Rail */}
        <div className="hidden w-[200px] shrink-0 sm:block">
          <div className="max-h-[calc(100vh-260px)] space-y-2.5 overflow-y-auto pr-1">
            {canvasSlides.map((s, i) => (
              <div key={i} className={`group rounded-lg p-1 ${i === active ? "bg-cyan/[0.08]" : "hover:bg-surface"}`}>
                <button type="button" onClick={() => setActive(i)} className="flex w-full items-start gap-2 text-left">
                  <span className="w-4 shrink-0 pt-1 text-[11px] font-semibold text-faint">{i + 1}</span>
                  <span className={`flex-1 overflow-hidden rounded-md border ${i === active ? "border-cyan/50" : "border-line"}`}><SlideCanvas slide={s} theme={deck.theme} /></span>
                </button>
                {editing && i > 0 ? (
                  <div className="mt-1 flex justify-end gap-1 pl-6 text-[11px] text-faint opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => move(i - 1, -1)} title="Move up" className="px-1 hover:text-cyan">↑</button>
                    <button onClick={() => move(i - 1, 1)} title="Move down" className="px-1 hover:text-cyan">↓</button>
                    <button onClick={() => removeSlide(i - 1)} title="Delete" className="px-1 hover:text-danger">✕</button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Stage */}
        <div className="min-w-0 flex-1">
          {editing ? (
            <SlideEditSurface
              key={`${active}-${activeSlide?.layout ?? "title"}`}
              isTitle={active === 0}
              title={title} subtitle={subtitle}
              slide={activeSlide} theme={deck.theme}
              onTitle={(v) => { setTitle(v); setDirty(true); }}
              onSubtitle={(v) => { setSubtitle(v); setDirty(true); }}
              onPatch={(patch) => patchSlide(contentIdx, patch)}
              onGenImage={() => genImage(contentIdx)}
              onFocusSave={saveSel}
              busy={saving}
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-line shadow-[0_8px_30px_rgba(15,23,42,0.08)]"><SlideCanvas slide={current} theme={deck.theme} /></div>
              <div className="mt-4 flex items-center justify-between text-[12px] text-faint">
                <span>Slide {active + 1} of {canvasSlides.length}</span>
                <span className="flex gap-1.5">
                  <button onClick={() => setActive((a) => Math.max(0, a - 1))} disabled={active === 0} className="rounded-lg border border-line px-2.5 py-1 text-soft hover:border-line-strong disabled:opacity-40">← Prev</button>
                  <button onClick={() => setActive((a) => Math.min(canvasSlides.length - 1, a + 1))} disabled={active === canvasSlides.length - 1} className="rounded-lg border border-line px-2.5 py-1 text-soft hover:border-line-strong disabled:opacity-40">Next →</button>
                </span>
              </div>
              {notes ? (
                <div className="mt-4 rounded-xl border border-line bg-card p-4">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-faint">Speaker notes</p>
                  <p className="text-[13px] leading-relaxed text-soft">{notes}</p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- toolbar ----------
const FONTS = ["Arial", "Calibri", "Georgia", "Times New Roman", "Verdana"];
const SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40];
function TBtn({ title, run, children }: { title: string; run: () => void; children: React.ReactNode }) {
  return <button type="button" title={title} onMouseDown={(e) => { e.preventDefault(); run(); }} className="flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[13px] font-semibold text-soft hover:bg-surface">{children}</button>;
}
function RichToolbar({ exec, setFontSize }: { exec: (c: string, v?: string) => void; setFontSize: (px: string) => void }) {
  const sel = "h-8 shrink-0 rounded-md border border-line-strong bg-surface px-2 text-[12px] text-soft outline-none focus:border-cyan/50";
  return (
    <div className="sticky top-0 z-30 mb-3 flex flex-wrap items-center gap-1 rounded-lg border border-line bg-card/95 px-2 py-1.5 backdrop-blur">
      <select aria-label="Font" defaultValue="Arial" className={`${sel} max-w-[120px]`} onMouseDown={(e) => e.stopPropagation()} onChange={(e) => exec("fontName", e.target.value)}>{FONTS.map((f) => <option key={f} value={f}>{f}</option>)}</select>
      <select aria-label="Size" defaultValue="18" className={sel} onChange={(e) => setFontSize(e.target.value)}>{SIZES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      <span className="mx-0.5 h-5 w-px bg-line-strong" />
      <TBtn title="Bold" run={() => exec("bold")}><b>B</b></TBtn>
      <TBtn title="Italic" run={() => exec("italic")}><i>I</i></TBtn>
      <TBtn title="Underline" run={() => exec("underline")}><u>U</u></TBtn>
      <label title="Text color" className="flex h-8 cursor-pointer items-center rounded-md px-1 hover:bg-surface" onMouseDown={(e) => e.preventDefault()}>
        <span className="text-[13px] font-semibold text-soft">A</span>
        <input type="color" defaultValue="#000000" onChange={(e) => exec("foreColor", e.target.value)} className="ml-0.5 size-4 cursor-pointer border-0 bg-transparent p-0" />
      </label>
      <span className="mx-0.5 h-5 w-px bg-line-strong" />
      <TBtn title="Bulleted list" run={() => exec("insertUnorderedList")}>•</TBtn>
      <span className="mx-0.5 h-5 w-px bg-line-strong" />
      <TBtn title="Undo" run={() => exec("undo")}>↶</TBtn>
      <TBtn title="Redo" run={() => exec("redo")}>↷</TBtn>
    </div>
  );
}

// ---------- editable regions ----------
const fld = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-cyan/50";
const lbl = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-faint";
const editableCls = "rounded-md bg-white/95 px-3 py-2 text-black outline-none ring-1 ring-line focus:ring-cyan/50";

/** A single-paragraph rich contentEditable. Inits once (key-remount on slide change); reads on input. */
function RichLine({ value, onChange, onFocusSave, className, style, plain: bare }: { value: RichText | undefined; onChange: (r: RichText) => void; onFocusSave: () => void; className?: string; style?: React.CSSProperties; plain?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.innerHTML = runsToHtml(value) || "<br>"; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={ref} contentEditable suppressContentEditableWarning className={className ?? editableCls} style={style}
    onInput={() => ref.current && onChange(bare ? (ref.current.textContent ?? "") : normalizeRich(domToRuns(ref.current)))} onKeyUp={onFocusSave} onMouseUp={onFocusSave} onBlur={onFocusSave} />;
}

/** A rich bullet list (contentEditable <ul>). Each <li> becomes one bullet paragraph. */
function RichList({ value, onChange, onFocusSave, className }: { value: RichText[]; onChange: (r: RichText[]) => void; onFocusSave: () => void; className?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = (value.length ? value : [""]).map((b) => `<li>${runsToHtml(b) || "<br>"}</li>`).join("");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const read = () => {
    if (!ref.current) return;
    const items = Array.from(ref.current.querySelectorAll("li")).map((li) => normalizeRich(domToRuns(li)));
    onChange(items.filter((r) => plain(r).length > 0 || items.length === 1));
  };
  return <ul ref={ref} contentEditable suppressContentEditableWarning className={className ?? `${editableCls} list-disc pl-7 [&_li]:mb-1`}
    onInput={read} onKeyUp={onFocusSave} onMouseUp={onFocusSave} onBlur={onFocusSave} />;
}

const DEFAULT_T: PptTheme = { dark: "0A0E1A", light: "F1F5F9", accent: "22D3EE", headColor: "15191F", headFont: "Arial", bodyFont: "Arial" };
const hx = (c?: string) => (c ? (c.startsWith("#") ? c : `#${c}`) : undefined);
// transparent, slide-styled editable region (no input chrome — it looks like the slide itself)
const onSlide = "outline-none focus:bg-cyan/[0.06] rounded-[0.6cqw] -mx-[0.6cqw] px-[0.6cqw]";

function SlideEditSurface({
  isTitle, title, subtitle, slide, theme, onTitle, onSubtitle, onPatch, onGenImage, onFocusSave, busy,
}: {
  isTitle: boolean; title: string; subtitle: string; slide?: DeckSlide; theme?: PptTheme;
  onTitle: (v: string) => void; onSubtitle: (v: string) => void; onPatch: (p: Partial<DeckSlide>) => void;
  onGenImage: () => void; onFocusSave: () => void; busy: boolean;
}) {
  const t = { ...DEFAULT_T, ...(theme ?? {}) };

  // ----- Title slide: edit directly on the dark cover -----
  if (isTitle) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-cyan/30 shadow-[0_8px_30px_rgba(15,23,42,0.10)]" style={{ containerType: "size", background: hx(t.dark) }}>
        <div className="flex h-full w-full flex-col items-center justify-center px-[8cqw] text-center">
          <RichLine plain value={title} onChange={(r) => onTitle(r as string)} onFocusSave={onFocusSave} className={`${onSlide} text-center`} style={{ color: hx(t.light), fontFamily: t.headFont, fontSize: "5.4cqw", fontWeight: 700, lineHeight: 1.15 }} />
          <RichLine plain value={subtitle} onChange={(r) => onSubtitle(r as string)} onFocusSave={onFocusSave} className={`${onSlide} mt-[2.5cqw] text-center`} style={{ color: hx(t.accent), fontFamily: t.headFont, fontSize: "2.7cqw" }} />
        </div>
      </div>
    );
  }
  if (!slide) return null;
  const layout = slide.layout ?? "bullets";
  const isTextLayout = RICH_LAYOUTS.has(layout);

  function switchLayout(next: PptLayout) {
    const p: Partial<DeckSlide> = { layout: next };
    if (next === "table" && !slide!.table) p.table = { headers: ["Column 1", "Column 2"], rows: [["", ""]] };
    if (next === "diagram" && !slide!.diagram) p.diagram = { kind: "process", nodes: ["Step 1", "Step 2", "Step 3"] };
    if (next === "stat" && !slide!.stats) p.stats = [{ value: "00", label: "Label" }, { value: "00", label: "Label" }];
    if (next === "two-column" && !slide!.columns) p.columns = { leftTitle: "", rightTitle: "", left: ["Point"], right: ["Point"] };
    if (next === "quote" && !slide!.quote) p.quote = { text: "Your quote", attribution: "" };
    if ((next === "bullets" || next === "image") && (slide!.bullets ?? []).length === 0) p.bullets = ["Point one"];
    onPatch(p);
  }

  // The editable slide canvas (text layouts) — looks like the slide; type on it directly.
  const editableSlide = (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-cyan/30 shadow-[0_8px_30px_rgba(15,23,42,0.10)]" style={{ containerType: "size", background: layout === "section" ? hx(t.dark) : "#FFFFFF" }}>
      {layout !== "section" ? <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1.2cqw", background: hx(t.accent) }} /> : null}

      {layout === "section" ? (
        <div className="flex h-full w-full flex-col items-center justify-center px-[8cqw] text-center">
          <RichLine value={slide.heading} onChange={(r) => onPatch({ heading: r })} onFocusSave={onFocusSave} className={`${onSlide} text-center`} style={{ color: hx(t.light), fontFamily: t.headFont, fontSize: "4.6cqw", fontWeight: 700 }} />
          <RichLine value={slide.bullets[0]} onChange={(r) => onPatch({ bullets: [r] })} onFocusSave={onFocusSave} className={`${onSlide} mt-[2cqw] text-center`} style={{ color: hx(t.accent), fontFamily: t.headFont, fontSize: "2.4cqw" }} />
        </div>
      ) : layout === "quote" ? (
        <div className="flex h-full w-full flex-col items-center justify-center px-[9cqw] text-center">
          <RichLine value={slide.quote?.text} onChange={(text) => onPatch({ quote: { ...(slide.quote ?? { attribution: "" }), text } })} onFocusSave={onFocusSave} className={onSlide} style={{ color: hx(t.headColor), fontFamily: t.headFont, fontStyle: "italic", fontSize: "3.6cqw", lineHeight: 1.25 }} />
          <RichLine plain value={slide.quote?.attribution} onChange={(r) => onPatch({ quote: { text: slide.quote?.text ?? "", attribution: r as string } })} onFocusSave={onFocusSave} className={`${onSlide} mt-[2.5cqw] text-center`} style={{ color: hx(t.accent), fontFamily: t.bodyFont, fontSize: "2.2cqw" }} />
        </div>
      ) : (
        <div className="flex h-full w-full flex-col px-[4.5cqw] pb-[4.5cqw] pt-[4.5cqw]">
          <RichLine value={slide.heading} onChange={(r) => onPatch({ heading: r })} onFocusSave={onFocusSave} className={onSlide} style={{ color: hx(t.headColor), fontFamily: t.headFont, fontSize: "3.6cqw", fontWeight: 700, lineHeight: 1.1 }} />
          <div style={{ width: "16cqw", height: "0.45cqw", background: hx(t.accent), margin: "1.4cqw 0 2.4cqw" }} />
          {layout === "two-column" && slide.columns ? (
            <div className="flex flex-1 gap-[4cqw]" style={{ color: "#333333", fontFamily: t.bodyFont, fontSize: "2.4cqw", lineHeight: 1.3 }}>
              {(["left", "right"] as const).map((side) => (
                <div key={side} className="flex flex-1 flex-col">
                  <RichLine plain value={slide.columns![side === "left" ? "leftTitle" : "rightTitle"]} onChange={(r) => onPatch({ columns: { ...slide.columns!, [side === "left" ? "leftTitle" : "rightTitle"]: r as string } })} onFocusSave={onFocusSave} className={`${onSlide} mb-[1cqw]`} style={{ color: hx(t.accent), fontFamily: t.headFont, fontWeight: 700, fontSize: "2.2cqw" }} />
                  <RichList value={slide.columns![side]} onChange={(v) => onPatch({ columns: { ...slide.columns!, [side]: v } })} onFocusSave={onFocusSave} className={`${onSlide} list-disc pl-[4cqw] [&_li]:mb-[1cqw]`} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 gap-[3cqw]" style={{ color: "#333333", fontFamily: t.bodyFont, fontSize: "2.7cqw", lineHeight: 1.3 }}>
              <div className="flex-1"><RichList value={slide.bullets} onChange={(b) => onPatch({ bullets: b })} onFocusSave={onFocusSave} className={`${onSlide} list-disc pl-[4cqw] [&_li]:mb-[1.2cqw]`} /></div>
              {layout === "image" ? (
                <div className="flex w-[38%] items-center justify-center rounded-[1cqw] border border-dashed border-line text-center text-[1.6cqw] text-faint">{slide.image ? "image set" : "image →"}</div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Layout + per-slide controls */}
      <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className="text-faint">Layout</span>
        <select className="rounded-lg border border-line-strong bg-surface px-2 py-1.5 text-soft outline-none focus:border-cyan/50" value={layout} onChange={(e) => switchLayout(e.target.value as PptLayout)}>{LAYOUTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</select>
        {layout === "image" ? (
          <>
            <button onClick={onGenImage} disabled={busy} className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 font-semibold text-soft hover:text-cyan disabled:opacity-40">{busy ? "Working…" : slide.image ? "↻ Regenerate image" : "✦ Generate image"}</button>
            {slide.image ? <button onClick={() => onPatch({ image: undefined })} className="text-faint hover:text-danger">remove image</button> : null}
          </>
        ) : null}
        {isTextLayout ? <span className="text-faint">· select text, then use the toolbar above</span> : null}
      </div>

      {/* The slide: editable for text layouts, live preview for structured ones */}
      {isTextLayout ? editableSlide : (
        <div className="overflow-hidden rounded-xl border border-line"><SlideCanvas slide={{ kind: "content", slide }} theme={theme} /></div>
      )}

      {/* Structured-block editors live below the slide (with the heading) */}
      {!isTextLayout ? (
        <div className="space-y-2 rounded-xl border border-cyan/25 bg-card p-4">
          <div><label className={lbl}>Heading</label><RichLine value={slide.heading} onChange={(r) => onPatch({ heading: r })} onFocusSave={onFocusSave} /></div>

      {layout === "table" && slide.table ? (
        <div className="space-y-2">
          <div><label className={lbl}>Headers (one per line)</label><textarea className={`${fld} min-h-[60px]`} value={toLines(slide.table.headers)} onChange={(e) => onPatch({ table: { ...slide.table!, headers: lines(e.target.value) } })} /></div>
          <div><label className={lbl}>Rows (one per line; cells separated by | )</label><textarea className={`${fld} min-h-[110px]`} value={slide.table.rows.map((r) => r.join(" | ")).join("\n")} onChange={(e) => onPatch({ table: { ...slide.table!, rows: lines(e.target.value).map((r) => r.split("|").map((c) => c.trim())) } })} /></div>
        </div>
      ) : null}

      {layout === "diagram" && slide.diagram ? (
        <div className="space-y-2">
          <div><label className={lbl}>Kind</label><select className={fld} value={slide.diagram.kind} onChange={(e) => onPatch({ diagram: { ...slide.diagram!, kind: e.target.value as "process" | "cycle" | "hierarchy" } })}><option value="process">Process (steps)</option><option value="cycle">Cycle (loop)</option><option value="hierarchy">Hierarchy</option></select></div>
          <div><label className={lbl}>Nodes (one per line, 2–6)</label><textarea className={`${fld} min-h-[100px]`} value={toLines(slide.diagram.nodes)} onChange={(e) => onPatch({ diagram: { ...slide.diagram!, nodes: lines(e.target.value) } })} /></div>
        </div>
      ) : null}

      {layout === "stat" && slide.stats ? (
        <div><label className={lbl}>Stats (one per line as value | label)</label><textarea className={`${fld} min-h-[90px]`} value={slide.stats.map((s) => `${s.value} | ${s.label}`).join("\n")} onChange={(e) => onPatch({ stats: lines(e.target.value).map((l) => { const [v, ...rest] = l.split("|"); return { value: (v ?? "").trim(), label: rest.join("|").trim() }; }).filter((s) => s.value && s.label) })} /></div>
      ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-line bg-card p-4"><label className={lbl}>Speaker notes</label><textarea className={`${fld} min-h-[60px]`} value={slide.notes ?? ""} onChange={(e) => onPatch({ notes: e.target.value })} /></div>
    </div>
  );
}
