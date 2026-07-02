"use client";

import { useRef, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cropFigureAction, resizeFigureAction, removeFigureAction } from "@/lib/actions/figures";

export type ApprovedFigure = {
  sectionIndex: number;
  heading: string;
  caption?: string;
  imageWidthPct?: number;
};

const VIEW_W = 400;
const VIEW_H = 267; // 3:2, matches the figure's embedded aspect ratio
const OUTPUT_W = 1200;
const OUTPUT_H = 800;

/** Pan/zoom cropper: drag to reposition, slider to zoom, always outputs the figure's 3:2 aspect. */
function CropModal({ docId, sectionIndex, onClose, onSaved }: { docId: string; sectionIndex: number; onClose: () => void; onSaved: () => void }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1); // 1 = "cover" fit, up to 3x
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coverScale = natural ? Math.max(VIEW_W / natural.w, VIEW_H / natural.h) : 1;
  const scale = coverScale * zoom;
  const dispW = natural ? natural.w * scale : VIEW_W;
  const dispH = natural ? natural.h * scale : VIEW_H;

  const clamp = useCallback(
    (x: number, y: number) => ({
      x: Math.min(0, Math.max(VIEW_W - dispW, x)),
      y: Math.min(0, Math.max(VIEW_H - dispH, y)),
    }),
    [dispW, dispH],
  );

  const onLoad = () => {
    const el = imgRef.current;
    if (!el) return;
    setNatural({ w: el.naturalWidth, h: el.naturalHeight });
    setOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    setOffset(clamp(drag.current.origX + dx, drag.current.origY + dy));
  };
  const onPointerUp = () => { drag.current = null; };

  const onZoom = (z: number) => {
    setZoom(z);
    setOffset((o) => clamp(o.x, o.y));
  };

  async function save() {
    const el = imgRef.current;
    if (!el || !natural) return;
    setSaving(true);
    setError(null);
    try {
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const sw = VIEW_W / scale;
      const sh = VIEW_H / scale;
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_W;
      canvas.height = OUTPUT_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported.");
      ctx.drawImage(el, sx, sy, sw, sh, 0, 0, OUTPUT_W, OUTPUT_H);
      const dataUrl = canvas.toDataURL("image/png");
      const res = await cropFigureAction(docId, sectionIndex, dataUrl);
      if (!res.ok) { setError(res.error ?? "Couldn't save the crop."); setSaving(false); return; }
      onSaved();
    } catch {
      setError("Couldn't save the crop.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-4" onClick={(e) => e.stopPropagation()}>
        <p className="mb-3 text-[13px] font-semibold text-ink">Crop figure</p>
        <div
          className="relative touch-none overflow-hidden rounded-lg border border-line bg-black/5"
          style={{ width: VIEW_W, height: VIEW_H, maxWidth: "100%" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={`/reports/${docId}/figure/${sectionIndex}`}
            alt="Figure"
            onLoad={onLoad}
            draggable={false}
            className="absolute cursor-grab select-none active:cursor-grabbing"
            style={{ left: offset.x, top: offset.y, width: dispW, height: dispH }}
          />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] text-muted">Zoom</span>
          <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => onZoom(Number(e.target.value))} className="flex-1" />
        </div>
        {error ? <p className="mt-2 text-[12px] text-warning">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:text-soft">Cancel</button>
          <button type="button" disabled={saving || !natural} onClick={save} className="rounded-lg bg-accent-gradient px-3 py-1.5 text-[12.5px] font-semibold text-on-accent disabled:opacity-60">
            {saving ? "Saving…" : "Save crop"}
          </button>
        </div>
      </div>
    </div>
  );
}

const FRAME_W = 260; // display width (px) at 100% — matches the figure's page-width-relative embed

type Corner = "tl" | "tr" | "bl" | "br";
const CORNERS: { key: Corner; cls: string; sign: 1 | -1 }[] = [
  { key: "tl", cls: "-left-1.5 -top-1.5 cursor-nwse-resize", sign: -1 },
  { key: "tr", cls: "-right-1.5 -top-1.5 cursor-nesw-resize", sign: 1 },
  { key: "bl", cls: "-left-1.5 -bottom-1.5 cursor-nesw-resize", sign: -1 },
  { key: "br", cls: "-right-1.5 -bottom-1.5 cursor-nwse-resize", sign: 1 },
];

function FigureCard({ docId, figure }: { docId: string; figure: ApprovedFigure }) {
  const router = useRouter();
  const [cropping, setCropping] = useState(false);
  const [selected, setSelected] = useState(false);
  const [widthPct, setWidthPct] = useState(figure.imageWidthPct ?? 100);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ startX: number; startPct: number; sign: 1 | -1 } | null>(null);

  function afterMutate() {
    setRefreshKey((k) => k + 1);
    router.refresh();
  }

  function commitResize(pct: number) {
    startBusy(async () => {
      const res = await resizeFigureAction(docId, figure.sectionIndex, pct);
      if (!res.ok) setError(res.error ?? "Couldn't resize.");
    });
  }

  function remove() {
    startBusy(async () => {
      const res = await removeFigureAction(docId, figure.sectionIndex);
      if (res.ok) router.refresh();
    });
  }

  function onHandlePointerDown(e: React.PointerEvent, sign: 1 | -1) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startPct: widthPct, sign };
  }
  function onHandlePointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const { startX, startPct, sign } = drag.current;
    const deltaPct = ((e.clientX - startX) * sign * 100) / FRAME_W;
    setWidthPct(Math.min(100, Math.max(20, Math.round(startPct + deltaPct))));
  }
  function onHandlePointerUp() {
    if (!drag.current) return;
    drag.current = null;
    commitResize(widthPct);
  }

  return (
    <div className="rounded-xl border border-line p-3">
      <p className="mb-1.5 text-[11.5px] font-semibold text-muted">{figure.heading}</p>

      <div className="flex justify-center py-1" onClick={() => setSelected((s) => !s)}>
        <div className="relative touch-none" style={{ width: FRAME_W * (widthPct / 100) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/reports/${docId}/figure/${figure.sectionIndex}?v=${refreshKey}`}
            alt={figure.caption ?? "Figure"}
            draggable={false}
            className={`w-full select-none rounded-lg border object-cover ${selected ? "border-cyan" : "border-line"}`}
            style={{ aspectRatio: "3 / 2" }}
          />
          {selected
            ? CORNERS.map((c) => (
                <div
                  key={c.key}
                  onPointerDown={(e) => onHandlePointerDown(e, c.sign)}
                  onPointerMove={onHandlePointerMove}
                  onPointerUp={onHandlePointerUp}
                  className={`absolute size-3 rounded-sm border-2 border-cyan bg-white ${c.cls}`}
                />
              ))
            : null}
        </div>
      </div>
      {selected ? <p className="text-center text-[11px] text-muted">{widthPct}% · drag a corner to resize</p> : null}
      {figure.caption ? <p className="mt-1 text-center text-[11.5px] italic text-muted">{figure.caption}</p> : null}

      <div className="mt-2 flex items-center justify-center gap-2">
        <button type="button" onClick={() => setCropping(true)} className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-soft hover:bg-surface">✂ Crop</button>
        <button type="button" disabled={busy} onClick={remove} className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-danger hover:bg-danger/10 disabled:opacity-60">Delete</button>
      </div>
      {error ? <p className="mt-1.5 text-center text-[11.5px] text-warning">{error}</p> : null}

      {cropping ? (
        <CropModal
          docId={docId}
          sectionIndex={figure.sectionIndex}
          onClose={() => setCropping(false)}
          onSaved={() => { setCropping(false); afterMutate(); }}
        />
      ) : null}
    </div>
  );
}

/** Preview + crop/resize/delete for figures already embedded in the report. */
export function FigureEditor({ docId, figures }: { docId: string; figures: ApprovedFigure[] }) {
  if (figures.length === 0) return null;
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-teal/12 text-teal">🖌️</span>
        <h2 className="font-display text-[15px] font-semibold text-ink">Your figures</h2>
      </div>
      <div className="space-y-3">
        {figures.map((f) => <FigureCard key={f.sectionIndex} docId={docId} figure={f} />)}
      </div>
    </div>
  );
}
