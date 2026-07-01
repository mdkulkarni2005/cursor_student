"use client";

import { useEffect, useState } from "react";

/**
 * Faithful preview for a deck bound to an uploaded .pptx template. We convert the REAL export to
 * PDF (via /ppt/[id]/pdf → Gotenberg) and show those exact slides — header, logo, info table and
 * all — so what the user sees matches what they download. When the page service isn't
 * running/configured we fall back to `children` (the in-app canvas), which is brand-approximate.
 */
export function TemplatePreview({ docId, version = 0, children }: { docId: string; version?: number; children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "pdf" | "fallback">("loading");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    let done = false;
    let objectUrl: string | null = null;
    setState("loading");
    setPdfUrl(null);
    setNote("");
    (async () => {
      try {
        // `version` busts both the browser and the route's max-age cache after an in-app edit.
        const res = await fetch(`/ppt/${docId}/pdf?v=${version}`, { cache: "no-store", signal: AbortSignal.timeout(45000) });
        if (done) return;
        if (res.ok && res.headers.get("content-type")?.includes("pdf")) {
          const blob = await res.blob();
          if (done) return;
          objectUrl = URL.createObjectURL(blob);
          setPdfUrl(`${objectUrl}#toolbar=0&navpanes=0&view=FitH`);
          setState("pdf");
          return;
        }
        setNote(res.status === 503
          ? "the slide preview service isn't running"
          : res.status === 502
            ? "the slide preview service couldn't convert this deck"
            : `the slide preview service returned ${res.status}`);
      } catch (e) {
        if (done) return;
        setNote(e instanceof DOMException && e.name === "TimeoutError"
          ? "the slide preview service didn't respond in time"
          : "the slide preview service is unreachable");
      }
      if (!done) setState("fallback");
    })();
    return () => { done = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [docId, version]);

  if (state === "loading") {
    return (
      <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-card py-16 text-[13px] text-faint">
        <span className="size-5 animate-spin rounded-full border-2 border-line-strong border-t-cyan" />
        Rendering your exact slides…
        <span className="text-[11px]">the first one can take ~20–40s while LibreOffice warms up</span>
      </div>
    );
  }

  if (state === "pdf" && pdfUrl) {
    return (
      <div className="mt-4">
        <iframe title="Presentation preview" src={pdfUrl} className="h-[80vh] w-full rounded-xl border border-line bg-white" />
        <p className="mt-2 text-[12px] text-faint">Exact slides from your template. Use <span className="font-semibold">Download PPTX</span> to edit in PowerPoint.</p>
      </div>
    );
  }

  // Fallback: the in-app canvas (brand-approximate), with a note explaining the gap.
  return (
    <div className="mt-4">
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/[0.07] px-3.5 py-2.5 text-[12px] text-warning">
        <span>⚠</span>
        <span>Showing a simplified preview because <span className="font-semibold">{note || "the slide preview service is unavailable"}</span> — this approximation won&apos;t match your template exactly. For the real slides, run <span className="font-mono font-semibold">pnpm gotenberg</span> (needs Docker) and reopen this tab. The downloaded PPTX always follows your template.</span>
      </div>
      {children}
    </div>
  );
}
