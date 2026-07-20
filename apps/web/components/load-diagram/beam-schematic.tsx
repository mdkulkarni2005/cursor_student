"use client";

import type { PointLoad, UdlLoad } from "@/lib/load-diagram/beam";

const WIDTH = 800;
const HEIGHT = 130;
const PAD_X = 36;
const BEAM_Y = 58;

/** Top-view schematic of the beam — pin/roller supports, point-load arrows, a UDL band, and the solved reactions. */
export function BeamSchematic({
  span,
  pointLoads,
  udls,
  reactions,
}: {
  span: number;
  pointLoads: PointLoad[];
  udls: UdlLoad[];
  reactions: { rA: number; rB: number };
}) {
  const plotW = WIDTH - PAD_X * 2;
  const scaleX = (x: number) => PAD_X + (span > 0 ? (x / span) * plotW : 0);

  return (
    <div className="rounded-lg border border-line bg-card p-2">
      <p className="mb-1 font-mono text-[10.5px] font-bold uppercase tracking-wide text-muted">Beam Schematic</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" preserveAspectRatio="none">
        {udls.map((u) => {
          const x1 = scaleX(u.start);
          const x2 = scaleX(u.end);
          const arrowCount = Math.max(2, Math.round(((x2 - x1) / plotW) * 12));
          return (
            <g key={u.id}>
              <line x1={x1} y1={BEAM_Y - 26} x2={x2} y2={BEAM_Y - 26} stroke="var(--color-blueprint)" strokeWidth={1.5} />
              {Array.from({ length: arrowCount }, (_, i) => {
                const x = x1 + ((x2 - x1) * i) / (arrowCount - 1 || 1);
                return (
                  <g key={i}>
                    <line x1={x} y1={BEAM_Y - 26} x2={x} y2={BEAM_Y - 4} stroke="var(--color-blueprint)" strokeWidth={1.2} />
                    <path d={`M${x - 3} ${BEAM_Y - 8} L${x} ${BEAM_Y - 3} L${x + 3} ${BEAM_Y - 8}`} fill="none" stroke="var(--color-blueprint)" strokeWidth={1.2} />
                  </g>
                );
              })}
              <text x={(x1 + x2) / 2} y={BEAM_Y - 32} textAnchor="middle" fontSize={9.5} fill="var(--color-blueprint)" stroke="none" fontWeight={700} className="font-mono">
                {u.magnitude} kN/m
              </text>
            </g>
          );
        })}

        {pointLoads.map((p) => {
          const x = scaleX(p.position);
          return (
            <g key={p.id}>
              <line x1={x} y1={16} x2={x} y2={BEAM_Y - 3} stroke="var(--color-danger)" strokeWidth={2} />
              <path d={`M${x - 4} ${BEAM_Y - 9} L${x} ${BEAM_Y - 2} L${x + 4} ${BEAM_Y - 9}`} fill="none" stroke="var(--color-danger)" strokeWidth={2} />
              <text x={x} y={12} textAnchor="middle" fontSize={9.5} fill="var(--color-danger)" stroke="none" fontWeight={700} className="font-mono">
                {p.magnitude} kN
              </text>
            </g>
          );
        })}

        <line x1={PAD_X} y1={BEAM_Y} x2={WIDTH - PAD_X} y2={BEAM_Y} stroke="var(--color-ink)" strokeWidth={3} />

        {/* Pin support at A */}
        <path d={`M${scaleX(0)} ${BEAM_Y} l-8 14 h16 z`} fill="none" stroke="var(--color-ink)" strokeWidth={1.6} />
        {/* Roller support at B */}
        <path d={`M${scaleX(span)} ${BEAM_Y} l-8 14 h16 z`} fill="none" stroke="var(--color-ink)" strokeWidth={1.6} />
        <circle cx={scaleX(span) - 4} cy={BEAM_Y + 18} r={2.4} fill="var(--color-ink)" />
        <circle cx={scaleX(span) + 4} cy={BEAM_Y + 18} r={2.4} fill="var(--color-ink)" />

        <text x={scaleX(0)} y={HEIGHT - 6} textAnchor="middle" fontSize={9.5} fill="var(--color-success)" stroke="none" fontWeight={700} className="font-mono">
          RA {reactions.rA.toFixed(2)} kN
        </text>
        <text x={scaleX(span)} y={HEIGHT - 6} textAnchor="middle" fontSize={9.5} fill="var(--color-success)" stroke="none" fontWeight={700} className="font-mono">
          RB {reactions.rB.toFixed(2)} kN
        </text>
      </svg>
    </div>
  );
}
