"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogoMark } from "@/components/logo";
import { PencilIcon, SlidesIcon, CodeIcon, MicIcon, ResumeIcon, ChatIcon } from "@/components/icons";

/**
 * The hero centerpiece: the same six things every engineering student juggles,
 * flowing from scattered/dim on the left, through the krackIT mark, into an
 * aligned/organized column on the right — a network diagram, not a static list,
 * so the "one platform" pitch is something you see (and can poke at), not just read.
 *
 * IMPORTANT: every positioned element below places itself with an inline
 * `transform: translate(...)`. Never put a CSS `animate-*` class that also
 * targets `transform` (fade-in-up, float-drift, etc.) directly on one of
 * those elements — a running/finished animation's `transform` wins over the
 * inline one and permanently knocks the element off its anchor point. Any
 * such animation goes on a non-positioned child instead.
 */
const ITEMS = [
  { key: "assignments", label: "Assignments", Icon: PencilIcon, left: { x: 95, y: 90 }, right: { x: 960, y: 66 } },
  { key: "ppt", label: "PPTs & reports", Icon: SlidesIcon, left: { x: 300, y: 46 }, right: { x: 980, y: 148 } },
  { key: "dsa", label: "DSA practice", Icon: CodeIcon, left: { x: 55, y: 240 }, right: { x: 960, y: 230 } },
  { key: "interview", label: "Mock interviews", Icon: MicIcon, left: { x: 275, y: 320 }, right: { x: 980, y: 312 } },
  { key: "resume", label: "Resume", Icon: ResumeIcon, left: { x: 90, y: 420 }, right: { x: 960, y: 394 } },
  { key: "dm", label: "DMs & offers", Icon: ChatIcon, left: { x: 280, y: 480 }, right: { x: 980, y: 476 } },
] as const;

const VB_W = 1200;
const VB_H = 540;
const CENTER = { x: VB_W / 2, y: VB_H / 2 };

/** Deterministic PRNG so the decorative node field renders identically on server and client. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Node = { x: number; y: number };

function buildField(cx: number, cy: number, rx: number, ry: number, count: number, seed: number) {
  const rand = mulberry32(seed);
  const nodes: Node[] = [];
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    nodes.push({ x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r });
  }
  const links: [Node, Node][] = [];
  for (let i = 0; i < nodes.length; i++) {
    const dists = nodes
      .map((n, j) => ({ j, d: (n.x - nodes[i].x) ** 2 + (n.y - nodes[i].y) ** 2 }))
      .filter((d) => d.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const { j } of dists) links.push([nodes[i], nodes[j]]);
  }
  return { nodes, links };
}

function curve(x1: number, y1: number, x2: number, y2: number) {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

export function ClutterToClarityVisual() {
  return (
    <>
      {/* Small screens: the scattered/network layout doesn't have room to breathe,
          so drop straight to the payoff — logo, then the organized list. */}
      <div className="flex flex-col items-center gap-4 py-4 sm:hidden">
        <div className="flex flex-col items-center gap-2 rounded-[28px] border border-cyan/30 bg-card px-8 py-5 shadow-[0_8px_40px_rgba(254,127,45,0.18)]">
          <LogoMark size={40} />
          <span className="text-[14px] font-extrabold tracking-tight text-ink">krackIT</span>
        </div>
        <div className="flex w-full flex-col gap-2.5 px-2">
          {ITEMS.map(({ label, Icon }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-line border-l-[3px] border-l-cyan bg-card px-3.5 py-2.5 shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-gradient text-on-accent">
                <Icon size={14} />
              </span>
              <span className="text-[14px] font-bold text-ink">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden sm:block">
        <ClutterToClarityNetwork />
      </div>
    </>
  );
}

function ClutterToClarityNetwork() {
  const leftField = useMemo(() => buildField(230, 270, 220, 250, 46, 7), []);
  const rightField = useMemo(() => buildField(1080, 270, 190, 250, 46, 13), []);

  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Record<string, { x: number; y: number }>>({});
  const [active, setActive] = useState<string>(ITEMS[0].key);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const draggingKeyRef = useRef<string | null>(null);
  const lastInteraction = useRef(0);

  // Keep the visual alive on its own — cycles the highlighted path every few
  // seconds, but backs off for a bit after the visitor actually touches it.
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - lastInteraction.current < 4000) return;
      setActive((cur) => {
        const i = ITEMS.findIndex((it) => it.key === cur);
        return ITEMS[(i + 1) % ITEMS.length].key;
      });
    }, 2400);
    return () => clearInterval(id);
  }, []);

  const setActiveManually = useCallback((key: string) => {
    lastInteraction.current = Date.now();
    setActive(key);
  }, []);

  const onPointerDown = useCallback((key: string, e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingKeyRef.current = key;
    setDraggingKey(key);
    setActiveManually(key);
  }, [setActiveManually]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const key = draggingKeyRef.current;
    if (!key || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scale = VB_W / rect.width;
    setDrag((prev) => {
      const base = prev[key] ?? { x: 0, y: 0 };
      return { ...prev, [key]: { x: base.x + e.movementX * scale, y: base.y + e.movementY * scale } };
    });
  }, []);

  const onPointerUp = useCallback(() => {
    draggingKeyRef.current = null;
    setDraggingKey(null);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-card px-6 py-2.5 text-[17px] font-bold tracking-wide text-muted shadow-sm sm:text-[19px]">
        clutter <span className="text-accent-gradient mx-1">→</span> clarity
      </span>
      <div
        ref={containerRef}
        className="relative w-full select-none overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-surface/60 to-transparent"
        style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
        {/* Decorative neural-network texture behind each cluster. */}
        {[leftField, rightField].map((field, fi) => (
          <g key={fi} opacity={0.5}>
            {field.links.map(([a, b], i) => (
              <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--color-line-strong)" strokeWidth={1} />
            ))}
            {field.nodes.map((n, i) => (
              <circle
                key={i}
                cx={n.x}
                cy={n.y}
                r={1.6}
                fill="var(--color-cyan)"
                className="animate-node-twinkle"
                style={{ animationDelay: `${(i % 9) * 0.28}s` }}
              />
            ))}
          </g>
        ))}

        {/* Flow paths: all six items → center → their organized twin, all at once —
            every connection is "live" concurrently, not just the clicked one. The
            active item just gets a brighter spotlight on top of that. */}
        {ITEMS.map((item, i) => {
          const d1 = drag[item.key] ?? { x: 0, y: 0 };
          const lx = item.left.x + d1.x;
          const ly = item.left.y + d1.y;
          const rightKey = item.key + ":r";
          const d2 = drag[rightKey] ?? { x: 0, y: 0 };
          const rx = item.right.x + d2.x;
          const ry = item.right.y + d2.y;
          const isActive = active === item.key;
          const pathIn = curve(lx, ly, CENTER.x, CENTER.y);
          const pathOut = curve(CENTER.x, CENTER.y, rx, ry);
          const dotDurNum = 2.2 + i * 0.15;
          const dotDur = `${dotDurNum}s`;
          return (
            <g key={item.key}>
              <path
                d={pathIn}
                fill="none"
                stroke={isActive ? "var(--color-cyan)" : "var(--color-line-strong)"}
                strokeWidth={isActive ? 2.5 : 1.5}
                strokeLinecap="round"
                className="transition-all duration-500"
                opacity={isActive ? 0.95 : 0.45}
              />
              <path
                d={pathOut}
                fill="none"
                stroke={isActive ? "var(--color-cyan)" : "var(--color-line-strong)"}
                strokeWidth={isActive ? 2.5 : 1.5}
                strokeLinecap="round"
                className="transition-all duration-500"
                opacity={isActive ? 0.95 : 0.45}
              />
              {/* Every path carries its own traveling dot, staggered by index, so all
                  six connections visibly build left → center → right at the same time. */}
              <circle r={isActive ? 5 : 3.5} fill={isActive ? "var(--color-indigo)" : "var(--color-cyan)"} className="animate-dot-glow" opacity={isActive ? 1 : 0.8}>
                <animateMotion dur={dotDur} begin={`${i * 0.35}s`} repeatCount="indefinite" path={pathIn} />
              </circle>
              <circle r={isActive ? 5 : 3.5} fill={isActive ? "var(--color-indigo)" : "var(--color-cyan)"} className="animate-dot-glow" opacity={isActive ? 1 : 0.8}>
                <animateMotion dur={dotDur} begin={`${i * 0.35 + dotDurNum / 2}s`} repeatCount="indefinite" path={pathOut} />
              </circle>
            </g>
          );
        })}
      </svg>

      {/* Center: the krackIT mark, the thing everything routes through. Centered with
          inset-0 + m-auto (no transform) so it can never be knocked off-center by an
          animation that also targets `transform`. */}
      <div
        className="absolute inset-0 m-auto flex flex-col items-center justify-center gap-2 rounded-[28px] border border-cyan/30 bg-card shadow-[0_8px_40px_rgba(254,127,45,0.18)]"
        style={{ width: "17%", aspectRatio: "1 / 1" }}
      >
        <span className="absolute inset-0 -z-10 animate-pulse-ring rounded-[28px] bg-cyan/10" />
        <span className="absolute inset-0 -z-10 animate-glow-pulse rounded-[28px]" />
        <span className="animate-fade-in-up flex flex-col items-center gap-2">
          <LogoMark size={44} />
          <span className="text-[13px] font-extrabold tracking-tight text-ink sm:text-[15px]">krackIT</span>
        </span>
      </div>

      {/* Left: scattered, dim, draggable — the clutter. Drifts idly in place, like it's
          restless, until it's the active item or the visitor picks it up. */}
      {ITEMS.map((item, i) => {
        const d = drag[item.key] ?? { x: 0, y: 0 };
        const isActive = active === item.key;
        const isDragging = draggingKey === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onPointerDown={(e) => onPointerDown(item.key, e)}
            onClick={() => setActiveManually(item.key)}
            className={`absolute flex cursor-grab touch-none items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-sm transition-[box-shadow,border-color,opacity] duration-300 active:cursor-grabbing ${
              isActive
                ? "z-10 border-cyan/50 opacity-100 shadow-[0_4px_18px_rgba(254,127,45,0.25)]"
                : "border-line opacity-70 saturate-[.7] hover:opacity-90"
            }`}
            style={{
              left: `${((item.left.x + d.x) / VB_W) * 100}%`,
              top: `${((item.left.y + d.y) / VB_H) * 100}%`,
              transform: `translate(-50%, -50%) scale(${isActive ? 1.1 : 1})`,
              transition: "transform 300ms",
            }}
          >
            <span className="animate-fade-in-up flex items-center" style={{ animationDelay: `${i * 70}ms` }}>
              <span
                className={`flex items-center gap-2 ${!isActive && !isDragging ? "animate-float-drift" : ""}`}
                style={!isActive && !isDragging ? { animationDuration: `${9 + i}s`, animationDelay: `${i * 0.5}s` } : undefined}
              >
                <item.Icon size={16} className={isActive ? "text-cyan" : "text-faint"} />
                <span className="whitespace-nowrap text-[13px] font-bold text-ink sm:text-[14px]">{item.label}</span>
              </span>
            </span>
          </button>
        );
      })}

      {/* Right: aligned, lit up, draggable — the clarity. */}
      {ITEMS.map((item, i) => {
        const rightKey = item.key + ":r";
        const d = drag[rightKey] ?? { x: 0, y: 0 };
        const isActive = active === item.key;
        return (
          <button
            key={rightKey}
            type="button"
            onPointerDown={(e) => onPointerDown(rightKey, e)}
            onClick={() => setActiveManually(item.key)}
            className={`absolute flex cursor-grab touch-none items-center gap-2.5 rounded-xl border border-l-[3px] bg-card px-3.5 py-2.5 shadow-[0_2px_10px_rgba(15,23,42,0.06)] transition-[box-shadow,border-color] duration-300 active:cursor-grabbing ${
              isActive ? "z-10 border-line border-l-cyan shadow-[0_4px_20px_rgba(254,127,45,0.25)]" : "border-line border-l-cyan/50"
            }`}
            style={{
              left: `${((item.right.x + d.x) / VB_W) * 100}%`,
              top: `${((item.right.y + d.y) / VB_H) * 100}%`,
              transform: `translate(0%, -50%) scale(${isActive ? 1.1 : 1})`,
              transition: "transform 300ms",
            }}
          >
            <span className="animate-fade-in-up flex items-center gap-2.5" style={{ animationDelay: `${120 + i * 90}ms` }}>
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-on-accent transition-transform duration-300 ${isActive ? "bg-accent-gradient scale-110" : "bg-ink/70"}`}>
                <item.Icon size={14} />
              </span>
              <span className="whitespace-nowrap text-[13.5px] font-bold text-ink sm:text-[14.5px]">{item.label}</span>
            </span>
          </button>
        );
      })}
      </div>
    </div>
  );
}
