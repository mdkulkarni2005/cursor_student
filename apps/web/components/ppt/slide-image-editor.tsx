"use client";

import { useRef, useState } from "react";
import { cropSlideImageAction, resizeSlideImageAction } from "@/lib/actions/ppt";
import type { Deck } from "./deck-viewer";

type Corner = "tl" | "tr" | "bl" | "br";
const CORNERS: { key: Corner; cls: string; sign: 1 | -1 }[] = [
  { key: "tl", cls: "-left-1.5 -top-1.5 cursor-nwse-resize", sign: -1 },
  { key: "tr", cls: "-right-1.5 -top-1.5 cursor-nesw-resize", sign: 1 },
  { key: "bl", cls: "-left-1.5 -bottom-1.5 cursor-nesw-resize", sign: -1 },
  { key: "br", cls: "-right-1.5 -bottom-1.5 cursor-nwse-resize", sign: 1 },
];

const VIEW_W = 320;
const OUTPUT_W = 1200;

/** Pan/zoom cropper — same pattern as the report figure editor's CropModal, parameterized by aspect. */
function CropModal({
  docId, slideIndex, aspect, getContent, onClose, onSaved,
}: {
  docId: string; slideIndex: number; aspect: number; getContent: () => Deck;
  onClose: () => void; onSaved: () => void;
}) {
  const viewH = VIEW_W / aspect;
  const outputH = Math.round(OUTPUT_W / aspect);
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coverScale = natural ? Math.max(VIEW_W / natural.w, viewH / natural.h) : 1;
  const scale = coverScale * zoom;
  const dispW = natural ? natural.w * scale : VIEW_W;
  const dispH = natural ? natural.h * scale : viewH;

  const clamp = (x: number, y: number) => ({
    x: Math.min(0, Math.max(VIEW_W - dispW, x)),
    y: Math.min(0, Math.max(viewH - dispH, y)),
  });

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
  const onZoom = (z: number) => { setZoom(z); setOffset((o) => clamp(o.x, o.y)); };

  async function save() {
    const el = imgRef.current;
    if (!el || !natural) return;
    setSaving(true);
    setError(null);
    try {
      const sx = -offset.x / scale, sy = -offset.y / scale;
      const sw = VIEW_W / scale, sh = viewH / scale;
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_W;
      canvas.height = outputH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported.");
      ctx.drawImage(el, sx, sy, sw, sh, 0, 0, OUTPUT_W, outputH);
      const dataUrl = canvas.toDataURL("image/png");
      const { title, subtitle, slides } = getContent();
      const res = await cropSlideImageAction(docId, slideIndex, dataUrl, { title, subtitle, slides });
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
        <p className="mb-3 text-[13px] font-semibold text-ink">Crop image</p>
        <div
          className="relative touch-none overflow-hidden rounded-lg border border-line bg-black/5"
          style={{ width: VIEW_W, height: viewH, maxWidth: "100%" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={`/ppt/${docId}/image/${slideIndex}`}
            alt="Slide image"
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

/**
 * Click-to-select + corner-drag resize + crop for a slide's embedded image ("the image itself" —
 * matches the report figure editor's interaction, adapted for PPT slides). Only rendered for the
 * actively-edited slide, never in thumbnails/Present mode.
 */
export function SlideImageEditor({
  docId, slideIndex, imageUrl, scale, aspect = 1, getContent, onMutated, className,
}: {
  docId: string; slideIndex: number; imageUrl: string; scale?: number; aspect?: number;
  getContent: () => Deck; onMutated: () => void; className?: string;
}) {
  const [selected, setSelected] = useState(false);
  const [localScale, setLocalScale] = useState(scale ?? 1);
  const [cropping, setCropping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ startX: number; startScale: number; sign: 1 | -1 } | null>(null);

  function commitResize(next: number) {
    (async () => {
      const { title, subtitle, slides } = getContent();
      const res = await resizeSlideImageAction(docId, slideIndex, next, { title, subtitle, slides });
      if (!res.ok) { setError(res.error ?? "Couldn't resize."); return; }
      onMutated();
    })();
  }

  function onHandlePointerDown(e: React.PointerEvent, sign: 1 | -1) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startScale: localScale, sign };
  }
  function onHandlePointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const { startX, startScale, sign } = drag.current;
    const delta = ((e.clientX - startX) * sign) / 150; // ~150px drag ≈ 1.0x change
    setLocalScale(Math.min(1.5, Math.max(0.5, startScale + delta)));
  }
  function onHandlePointerUp() {
    if (!drag.current) return;
    drag.current = null;
    commitResize(localScale);
  }

  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      <div className="relative touch-none" onClick={(e) => { e.stopPropagation(); setSelected((s) => !s); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          className={`max-h-full max-w-full select-none rounded-[1cqw] object-contain ${selected ? "outline outline-2 outline-cyan" : ""}`}
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
      {selected ? (
        <div className="absolute left-1/2 top-full z-10 mt-1.5 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-card px-2 py-1 shadow-lg">
          <button type="button" onClick={(e) => { e.stopPropagation(); setCropping(true); }} className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-soft hover:bg-surface">✂ Crop</button>
          <span className="text-[10.5px] text-faint">{Math.round(localScale * 100)}%</span>
        </div>
      ) : null}
      {error ? <p className="absolute left-1/2 top-full mt-8 -translate-x-1/2 whitespace-nowrap text-[11px] text-warning">{error}</p> : null}
      {cropping ? (
        <CropModal
          docId={docId}
          slideIndex={slideIndex}
          aspect={aspect}
          getContent={getContent}
          onClose={() => setCropping(false)}
          onSaved={() => { setCropping(false); setSelected(false); onMutated(); }}
        />
      ) : null}
    </div>
  );
}
