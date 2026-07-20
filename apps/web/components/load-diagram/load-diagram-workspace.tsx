"use client";

import { useMemo, useState } from "react";
import { computeBeamDiagrams, type PointLoad, type UdlLoad } from "@/lib/load-diagram/beam";
import { BeamSchematic } from "@/components/load-diagram/beam-schematic";
import { DiagramTrace } from "@/components/load-diagram/diagram-trace";

function newId() {
  return `l${Date.now()}_${Math.round(Math.random() * 1e4)}`;
}

const NUMBER_FIELD = "w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-blueprint/50";

export function LoadDiagramWorkspace() {
  const [span, setSpan] = useState(6);
  const [pointLoads, setPointLoads] = useState<PointLoad[]>([{ id: newId(), position: 3, magnitude: 20 }]);
  const [udls, setUdls] = useState<UdlLoad[]>([{ id: newId(), start: 0, end: 6, magnitude: 5 }]);

  const diagrams = useMemo(() => computeBeamDiagrams({ span, pointLoads, udls }), [span, pointLoads, udls]);

  function updatePointLoad(id: string, patch: Partial<PointLoad>) {
    setPointLoads((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function updateUdl(id: string, patch: Partial<UdlLoad>) {
    setUdls((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4">
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted">
            Beam Span <span className="font-mono text-blueprint">{span} m</span>
          </span>
          <input type="range" min={1} max={20} step={0.5} value={span} onChange={(e) => setSpan(Number(e.target.value))} className="w-full accent-blueprint" />
        </label>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Point Loads</p>
            <button
              type="button"
              onClick={() => setPointLoads((prev) => [...prev, { id: newId(), position: Math.round(span / 2), magnitude: 10 }])}
              className="rounded-md border border-line px-2 py-0.5 text-[11px] font-semibold text-blueprint hover:bg-blueprint/10"
            >
              + Add
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {pointLoads.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5 rounded-lg border border-line p-2">
                <label className="flex-1 text-[10.5px] text-faint">
                  Pos (m)
                  <input
                    type="number"
                    min={0}
                    max={span}
                    step={0.1}
                    value={p.position}
                    onChange={(e) => updatePointLoad(p.id, { position: Number(e.target.value) })}
                    className={NUMBER_FIELD}
                  />
                </label>
                <label className="flex-1 text-[10.5px] text-faint">
                  P (kN)
                  <input type="number" step={0.5} value={p.magnitude} onChange={(e) => updatePointLoad(p.id, { magnitude: Number(e.target.value) })} className={NUMBER_FIELD} />
                </label>
                <button
                  type="button"
                  onClick={() => setPointLoads((prev) => prev.filter((x) => x.id !== p.id))}
                  className="mt-3 rounded-md px-1.5 py-1 text-[13px] text-danger hover:bg-danger/10"
                  aria-label="Remove point load"
                >
                  ×
                </button>
              </div>
            ))}
            {pointLoads.length === 0 && <p className="text-[11.5px] text-faint">No point loads.</p>}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">UDLs</p>
            <button
              type="button"
              onClick={() => setUdls((prev) => [...prev, { id: newId(), start: 0, end: span, magnitude: 4 }])}
              className="rounded-md border border-line px-2 py-0.5 text-[11px] font-semibold text-blueprint hover:bg-blueprint/10"
            >
              + Add
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {udls.map((u) => (
              <div key={u.id} className="flex items-center gap-1.5 rounded-lg border border-line p-2">
                <label className="flex-1 text-[10.5px] text-faint">
                  Start (m)
                  <input type="number" min={0} max={span} step={0.1} value={u.start} onChange={(e) => updateUdl(u.id, { start: Number(e.target.value) })} className={NUMBER_FIELD} />
                </label>
                <label className="flex-1 text-[10.5px] text-faint">
                  End (m)
                  <input type="number" min={0} max={span} step={0.1} value={u.end} onChange={(e) => updateUdl(u.id, { end: Number(e.target.value) })} className={NUMBER_FIELD} />
                </label>
                <label className="flex-1 text-[10.5px] text-faint">
                  w (kN/m)
                  <input type="number" step={0.5} value={u.magnitude} onChange={(e) => updateUdl(u.id, { magnitude: Number(e.target.value) })} className={NUMBER_FIELD} />
                </label>
                <button
                  type="button"
                  onClick={() => setUdls((prev) => prev.filter((x) => x.id !== u.id))}
                  className="mt-3 rounded-md px-1.5 py-1 text-[13px] text-danger hover:bg-danger/10"
                  aria-label="Remove UDL"
                >
                  ×
                </button>
              </div>
            ))}
            {udls.length === 0 && <p className="text-[11.5px] text-faint">No distributed loads.</p>}
          </div>
        </div>

        <p className="text-[11.5px] leading-relaxed text-faint">
          Simply supported beam — pin at A (x=0), roller at B (x=span). Diagrams update live as you edit any value above.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {!diagrams.valid ? (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-[13px] text-danger">{diagrams.error}</div>
        ) : (
          <>
            <BeamSchematic span={span} pointLoads={pointLoads} udls={udls} reactions={diagrams.reactions} />
            <DiagramTrace data={diagrams.shear} span={span} peak={diagrams.maxShear} label="Shear Force Diagram (SFD)" unit="kN" color="var(--color-blueprint)" />
            <DiagramTrace data={diagrams.moment} span={span} peak={diagrams.maxMoment} label="Bending Moment Diagram (BMD)" unit="kN·m" color="var(--color-flask)" />
          </>
        )}
      </div>
    </div>
  );
}
