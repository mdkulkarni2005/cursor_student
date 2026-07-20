import type { GateKind } from "@/lib/logic-sim/types";

/**
 * Standard IEEE/ANSI logic-gate bodies — the same shapes students see in a digital-logic
 * textbook. Pure inline SVG, themed via `currentColor`/`stroke` so it follows the scope-green
 * bench accent (distinct from the Circuit Builder's cyan schematic-sheet look).
 */
export function GateSymbol({ kind, active = false, className = "" }: { kind: GateKind; active?: boolean; className?: string }) {
  const stroke = active ? "var(--color-scope, #7CFF6B)" : "currentColor";
  const common = { fill: "none", stroke, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (kind) {
    case "and":
    case "nand":
      return (
        <svg viewBox="0 0 44 32" width="40" height="30" className={className}>
          <path {...common} d="M4 4 H20 A12 12 0 0 1 20 28 H4 Z" />
          {kind === "nand" ? <circle cx="35" cy="16" r="2.4" {...common} /> : null}
          <path {...common} d={`M0 9 H4 M0 23 H4 M${kind === "nand" ? 37 : 32} 16 H42`} />
        </svg>
      );
    case "or":
    case "nor":
      return (
        <svg viewBox="0 0 44 32" width="40" height="30" className={className}>
          <path {...common} d="M4 4 Q16 16 4 28 Q20 26 32 16 Q20 6 4 4 Z" />
          {kind === "nor" ? <circle cx="35" cy="16" r="2.4" {...common} /> : null}
          <path {...common} d={`M2 9 H7 M2 23 H7 M${kind === "nor" ? 37 : 32} 16 H42`} />
        </svg>
      );
    case "xor":
      return (
        <svg viewBox="0 0 44 32" width="40" height="30" className={className}>
          <path {...common} d="M0 4 Q6 16 0 28" />
          <path {...common} d="M4 4 Q16 16 4 28 Q20 26 32 16 Q20 6 4 4 Z" />
          <path {...common} d="M2 9 H7 M2 23 H7 M32 16 H42" />
        </svg>
      );
    case "not":
      return (
        <svg viewBox="0 0 44 32" width="40" height="30" className={className}>
          <path {...common} d="M4 4 L4 28 L28 16 Z" />
          <circle cx="32" cy="16" r="2.4" {...common} />
          <path {...common} d="M0 16 H4 M34 16 H42" />
        </svg>
      );
    case "dff":
      return (
        <svg viewBox="0 0 44 36" width="40" height="34" className={className}>
          <rect x="6" y="2" width="32" height="32" {...common} />
          <text x="10" y="14" fontSize="8" fill={stroke} stroke="none" fontWeight={700}>D</text>
          <text x="27" y="14" fontSize="8" fill={stroke} stroke="none" fontWeight={700}>Q</text>
          <path {...common} d="M9 24 L14 28 L9 32" />
          <text x="20" y="31" fontSize="6.5" fill={stroke} stroke="none">CLK</text>
          <path {...common} d="M0 8 H6 M0 28 H6 M38 8 H44" />
        </svg>
      );
    case "input":
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" className={className}>
          <circle cx="16" cy="16" r="12" {...common} fill={active ? stroke : "none"} fillOpacity={active ? 0.2 : 0} />
          <path {...common} d={active ? "M10 16 L22 16" : "M10 20 L22 12"} />
        </svg>
      );
    case "led":
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" className={className}>
          <circle cx="16" cy="16" r="11" {...common} fill={active ? stroke : "none"} fillOpacity={active ? 0.45 : 0} />
          <text x="16" y="20" textAnchor="middle" fontSize="9" fill={stroke} stroke="none" fontWeight={700}>
            LED
          </text>
        </svg>
      );
  }
}
