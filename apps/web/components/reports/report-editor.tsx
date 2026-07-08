"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useFormStatus } from "react-dom";
import { updateReportAction } from "@/lib/actions/reports";
import { Button, Spinner } from "@/components/ui/button";

export type ReportData = {
  abstract?: string;
  sections?: { heading: string; content: string }[];
  references?: string[];
};

const FONTS = [
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Calibri", value: "Calibri, 'Segoe UI', sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
];
const SIZES = [9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildHtml(data: ReportData): string {
  const paras = (text: string) =>
    text.split(/\n\s*\n/).map((b) => `<p>${esc(b).replace(/\n/g, "<br>") || "<br>"}</p>`).join("");
  const parts: string[] = [];
  if (data.abstract) parts.push(`<h2>Abstract</h2>${paras(data.abstract)}`);
  for (const s of data.sections ?? []) parts.push(`<h2>${esc(s.heading)}</h2>${paras(s.content)}`);
  if (data.references && data.references.length > 0) {
    parts.push(`<h2>References</h2><ol>${data.references.map((r) => `<li>${esc(r)}</li>`).join("")}</ol>`);
  }
  return parts.join("") || "<p><br></p>";
}

function parseDoc(root: HTMLElement): ReportData {
  const data: ReportData = { sections: [], references: [] };
  let heading: string | null = null;
  let buf: string[] = [];
  const flush = () => {
    const content = buf.join("\n\n").trim();
    buf = [];
    if (heading == null) { if (content) data.abstract = content; return; }
    const key = heading.trim().toLowerCase();
    if (key === "abstract") data.abstract = content;
    else if (key === "references") data.references = content.split("\n").map((r) => r.trim()).filter(Boolean);
    else if (heading.trim()) data.sections!.push({ heading: heading.trim(), content });
  };
  root.childNodes.forEach((node) => {
    if (node.nodeType !== 1) { const t = node.textContent?.trim(); if (t) buf.push(t); return; }
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "h1" || tag === "h2" || tag === "h3") { flush(); heading = el.textContent ?? ""; }
    else if (tag === "ul" || tag === "ol") el.querySelectorAll("li").forEach((li) => buf.push(li.textContent ?? ""));
    else { const t = el.textContent ?? ""; buf.push(t.trim() ? t : ""); }
  });
  flush();
  return data;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} loadingText="Saving…" className="rounded-lg bg-accent-gradient px-4 py-2 text-[13px] font-semibold text-on-accent shadow-[0_4px_14px_rgba(246,146,30,0.3)]">
      Save to template
    </Button>
  );
}

function TBtn({ title, onRun, children }: { title: string; onRun: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onMouseDown={(e) => { e.preventDefault(); onRun(); }}
      className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md px-2 text-[13px] font-semibold text-soft transition-colors hover:bg-surface">
      {children}
    </button>
  );
}
const Sep = () => <span className="mx-0.5 h-5 w-px shrink-0 bg-line-strong" />;

/**
 * Page-accurate preview of the report. Prefers a server-rendered PDF (exact Word pages + page
 * count, via Gotenberg) shown in the browser's PDF viewer; falls back to the HTML docx renderer
 * when PDF rendering isn't configured (GOTENBERG_URL unset) so the preview always works.
 */
function WordPreview({ docId, refreshKey }: { docId: string; refreshKey: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // "pdf" = exact LibreOffice pages (Gotenberg up). "html" = docx-preview fallback (can't split
  // long pages). "error" = nothing renderable.
  const [state, setState] = useState<"loading" | "pdf" | "html" | "error">("loading");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  // Why the exact-PDF path wasn't used — surfaced to the user so this never silently spins.
  const [note, setNote] = useState<string>("");

  const fit = useCallback(() => {
    const host = ref.current;
    if (!host) return;
    const wrapper = host.querySelector<HTMLElement>(".docx-wrapper");
    const page = host.querySelector<HTMLElement>(".docx");
    if (!wrapper || !page) return;
    const scale = Math.min(1, (host.clientWidth - 8) / page.offsetWidth);
    wrapper.style.transform = `scale(${scale})`;
    wrapper.style.transformOrigin = "top center";
    host.style.height = scale < 1 ? `${wrapper.scrollHeight * scale + 24}px` : "";
  }, []);

  const renderHtml = useCallback(async (cancelled: () => boolean) => {
    try {
      const { renderAsync } = await import("docx-preview");
      const res = await fetch(`/reports/${docId}/download`, { cache: "no-store" });
      if (!res.ok) throw new Error("no export");
      const blob = await res.blob();
      if (cancelled() || !ref.current) return;
      ref.current.innerHTML = "";
      await renderAsync(blob, ref.current, undefined, {
        className: "docx", inWrapper: true, breakPages: true, ignoreLastRenderedPageBreak: false, experimental: true,
      });
      if (cancelled()) return;
      fit();
      setState("html");
    } catch {
      if (!cancelled()) setState("error");
    }
  }, [docId, fit]);

  useEffect(() => {
    let done = false;
    const cancelled = () => done;
    let objectUrl: string | null = null;
    setPdfUrl(null);
    setNote("");
    (async () => {
      setState("loading");
      // Fetch the exact page-PDF directly (one request = one LibreOffice conversion). A generous
      // timeout means the first cold conversion has room, but the UI can never hang forever.
      try {
        const res = await fetch(`/reports/${docId}/pdf`, { cache: "no-store", signal: AbortSignal.timeout(45000) });
        if (cancelled()) return;
        if (res.ok && res.headers.get("content-type")?.includes("pdf")) {
          const blob = await res.blob();
          if (cancelled()) return;
          objectUrl = URL.createObjectURL(blob);
          setPdfUrl(`${objectUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&view=FitH`);
          setState("pdf");
          return;
        }
        // Not a PDF → explain why (503 = service not configured/up, 502 = conversion failed).
        setNote(res.status === 503
          ? "the page service isn't running"
          : res.status === 502
            ? "the page service couldn't convert this file"
            : `the page service returned ${res.status}`);
      } catch (e) {
        if (cancelled()) return;
        setNote(e instanceof DOMException && e.name === "TimeoutError"
          ? "the page service didn't respond in time"
          : "the page service is unreachable");
      }
      // Fallback: docx-preview HTML (clean, no browser chrome, but can't split long pages).
      await renderHtml(cancelled);
    })();
    return () => { done = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [docId, refreshKey, renderHtml]);

  useEffect(() => {
    const onResize = () => fit();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fit]);

  return (
    <div className="relative">
      {state === "loading" ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-[13px] text-faint">
          <Spinner /> Rendering exact A4 pages…
          <span className="text-[11px]">the first one can take ~20–40s while LibreOffice warms up</span>
        </div>
      ) : null}
      {state === "error" ? (
        <div className="py-12 text-center text-[13px] text-warning">Couldn&apos;t render the preview. Use <span className="font-semibold">Download DOCX</span> to open it in Word.</div>
      ) : null}
      {state === "pdf" && pdfUrl ? (
        <iframe title="Report preview" src={pdfUrl} className="h-[80vh] w-full rounded-lg border border-line bg-white" />
      ) : null}
      {state === "html" ? (
        <>
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/[0.07] px-3.5 py-2.5 text-[12px] text-warning">
            <span>⚠</span>
            <span>Showing a simplified preview because <span className="font-semibold">{note || "the page service is unavailable"}</span> — long sections appear as one tall page. For exact A4 pages, run <span className="font-mono font-semibold">pnpm gotenberg</span> (needs Docker) and reopen this tab. The downloaded DOCX is always correctly paginated.</span>
          </div>
          <div className="docxp overflow-auto" ref={ref} />
        </>
      ) : null}
    </div>
  );
}

export function ReportEditor({ docId, initial, editable = true, hasExport = false }: { docId: string; initial: ReportData; editable?: boolean; hasExport?: boolean }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  // Default to the exact Word-accurate preview — the "Document" tab is a plain-text editor that
  // doesn't render the report's markdown (bold/headings/tables), so it looks broken even though the
  // actual exported .docx is correctly formatted. Only fall back to it when there's nothing to preview yet.
  const [mode, setMode] = useState<"preview" | "edit">(hasExport ? "preview" : "edit");
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (mode === "edit" && editorRef.current) {
      editorRef.current.innerHTML = buildHtml(initial);
      if (hiddenRef.current) hiddenRef.current.value = JSON.stringify(initial);
    }
  }, [initial, mode]);

  const saveSel = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreSel = () => {
    const sel = window.getSelection();
    if (savedRange.current && sel) { sel.removeAllRanges(); sel.addRange(savedRange.current); }
  };
  const sync = () => {
    if (editorRef.current && hiddenRef.current) hiddenRef.current.value = JSON.stringify(parseDoc(editorRef.current));
  };
  const exec = (cmd: string, value?: string) => { editorRef.current?.focus(); restoreSel(); document.execCommand(cmd, false, value); sync(); };
  const setFontSize = (px: string) => {
    editorRef.current?.focus(); restoreSel(); document.execCommand("fontSize", false, "7");
    editorRef.current?.querySelectorAll('font[size="7"]').forEach((f) => { f.removeAttribute("size"); (f as HTMLElement).style.fontSize = `${px}px`; });
    sync();
  };

  const Tabs = (
    <div className="flex items-center gap-1 rounded-lg bg-surface p-0.5">
      {editable ? (
        <button type="button" onClick={() => setMode("edit")} className={`rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${mode === "edit" ? "bg-cyan/20 text-cyan" : "text-muted hover:text-soft"}`}>Document</button>
      ) : null}
      {hasExport ? (
        <button type="button" onClick={() => setMode("preview")} className={`rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${mode === "preview" ? "bg-cyan/20 text-cyan" : "text-muted hover:text-soft"}`}>Word preview</button>
      ) : null}
    </div>
  );

  // ---------- Preview (faithful Word render) ----------
  if (mode === "preview") {
    return (
      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
          {Tabs}
          <span className="text-[11px] text-faint">Page-accurate Word preview</span>
        </div>
        <div className="bg-surface p-2 sm:p-6">
          <WordPreview docId={docId} refreshKey={previewKey} />
        </div>
        <p className="border-t border-line px-4 py-2 text-[11px] text-faint">This is your actual Word file — pages, borders and images from your template, rendered exactly as it downloads.</p>
      </div>
    );
  }

  // ---------- Edit (text WYSIWYG) ----------
  if (!editable) {
    return (
      <div className="mt-6 rounded-2xl border border-line bg-canvas p-3 sm:p-6">
        <p className="mb-4 text-center text-[12px] text-faint">Preview — editing unlocks once the report is ready.</p>
        <div className="report-doc mx-auto w-full max-w-[760px] rounded-2xl border border-line bg-white px-8 py-10 shadow-[0_4px_24px_rgba(15,23,42,0.06)] sm:px-12">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-cyan">Academic Submission</p>
          <div dangerouslySetInnerHTML={{ __html: buildHtml(initial) }} />
        </div>
      </div>
    );
  }

  return (
    <form action={updateReportAction} onSubmit={() => setTimeout(() => { setPreviewKey((k) => k + 1); setMode(hasExport ? "preview" : "edit"); }, 50)}
      className="mt-6 rounded-2xl border border-cyan/25 bg-surface">
      <input type="hidden" name="docId" value={docId} />
      <input ref={hiddenRef} type="hidden" name="report" />

      {/* Toolbar — sticky to the top of the page scroll so it's reachable while editing anywhere.
          (The form must NOT have overflow-hidden, or sticky positioning breaks.) */}
      <div className="sticky top-0 z-30 rounded-t-2xl border-b border-line bg-card/95 px-2 py-2 shadow-[0_4px_12px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-2">{Tabs}<SaveButton /></div>
        <div className="flex flex-nowrap items-center gap-1 overflow-x-auto sm:flex-wrap">
          <select aria-label="Paragraph style" onChange={(e) => { exec("formatBlock", e.target.value); e.target.selectedIndex = 0; }}
            className="h-8 shrink-0 rounded-md border border-line-strong bg-surface px-2 text-[12px] text-soft outline-none focus:border-cyan/50">
            <option value="">Style</option><option value="<p>">Normal</option><option value="<h1>">Heading 1</option><option value="<h2>">Heading 2</option><option value="<h3>">Heading 3</option>
          </select>
          <select aria-label="Font" onChange={(e) => exec("fontName", e.target.value)} defaultValue={FONTS[0].value}
            className="h-8 max-w-[120px] shrink-0 rounded-md border border-line-strong bg-surface px-2 text-[12px] text-soft outline-none focus:border-cyan/50">
            {FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
          </select>
          <select aria-label="Font size" onChange={(e) => setFontSize(e.target.value)} defaultValue="12"
            className="h-8 shrink-0 rounded-md border border-line-strong bg-surface px-2 text-[12px] text-soft outline-none focus:border-cyan/50">
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Sep />
          <TBtn title="Bold" onRun={() => exec("bold")}><span className="font-bold">B</span></TBtn>
          <TBtn title="Italic" onRun={() => exec("italic")}><span className="italic">I</span></TBtn>
          <TBtn title="Underline" onRun={() => exec("underline")}><span className="underline">U</span></TBtn>
          <label title="Text color" className="flex h-8 shrink-0 cursor-pointer items-center rounded-md px-1 hover:bg-surface" onMouseDown={(e) => e.preventDefault()}>
            <span className="text-[13px] font-semibold text-soft">A</span>
            <input type="color" defaultValue="#000000" onChange={(e) => exec("foreColor", e.target.value)} className="ml-0.5 size-4 cursor-pointer border-0 bg-transparent p-0" />
          </label>
          <Sep />
          <TBtn title="Align left" onRun={() => exec("justifyLeft")}>⯇</TBtn>
          <TBtn title="Center" onRun={() => exec("justifyCenter")}>≡</TBtn>
          <TBtn title="Align right" onRun={() => exec("justifyRight")}>⯈</TBtn>
          <TBtn title="Justify" onRun={() => exec("justifyFull")}>☰</TBtn>
          <Sep />
          <TBtn title="Bulleted list" onRun={() => exec("insertUnorderedList")}>•</TBtn>
          <TBtn title="Numbered list" onRun={() => exec("insertOrderedList")}>1.</TBtn>
          <Sep />
          <TBtn title="Undo" onRun={() => exec("undo")}>↶</TBtn>
          <TBtn title="Redo" onRun={() => exec("redo")}>↷</TBtn>
        </div>
      </div>

      <div className="bg-canvas px-2 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-[760px] rounded-2xl border border-line bg-white px-8 py-10 shadow-[0_4px_24px_rgba(15,23,42,0.06)] sm:px-12">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-cyan">Academic Submission</p>
          <div ref={editorRef} contentEditable suppressContentEditableWarning spellCheck
            onInput={sync} onMouseUp={saveSel} onKeyUp={saveSel} onBlur={() => { saveSel(); sync(); }}
            className="report-doc min-h-[55vh] outline-none" />
        </div>
      </div>

      <p className="border-t border-line px-4 py-2 text-[11px] text-faint">Edit the words here; on save we write them back into <span className="text-soft">your uploaded template</span> and re-render the Word file (use <span className="text-soft">Word preview</span> to see the exact pages).</p>
    </form>
  );
}
