import type { CircuitComponentKind } from "@/lib/circuits/types";

/**
 * Real IEC/ANSI-style schematic symbols (not emoji) — this is what an EE student actually sees in
 * a textbook circuit diagram. Pure inline SVG so it themes with `currentColor` and needs no assets.
 */
export function CircuitSymbol({ kind, active = false, className = "" }: { kind: CircuitComponentKind; active?: boolean; className?: string }) {
  const stroke = active ? "var(--color-cyan, #22d3ee)" : "currentColor";
  const common = { fill: "none", stroke, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (kind) {
    case "resistor":
      return (
        <svg viewBox="0 0 44 20" width="40" height="18" className={className}>
          <path {...common} d="M2 10 H10 M10 10 L13 4 L18 16 L23 4 L28 16 L33 4 L36 10 M36 10 H42" />
        </svg>
      );
    case "voltage-source":
      // Standard 2-cell battery symbol: long-thin plate = +, short-thick plate = − (IEEE 315).
      return (
        <svg viewBox="0 0 44 24" width="40" height="22" className={className}>
          <line x1="2" y1="12" x2="12" y2="12" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
          <line x1="12" y1="3" x2="12" y2="21" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
          <line x1="18" y1="7" x2="18" y2="17" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" />
          <line x1="26" y1="3" x2="26" y2="21" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
          <line x1="32" y1="7" x2="32" y2="17" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" />
          <line x1="32" y1="12" x2="42" y2="12" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" />
        </svg>
      );
    case "switch":
      return (
        <svg viewBox="0 0 44 24" width="40" height="22" className={className}>
          <circle cx="10" cy="16" r="1.6" fill={stroke} />
          <circle cx="34" cy="16" r="1.6" fill={stroke} />
          <path {...common} d="M2 16 H8 M36 16 H42" />
          <path {...common} d={active ? "M10 16 H34" : "M10 16 L30 6"} />
        </svg>
      );
    case "motor":
      return (
        <svg viewBox="0 0 32 32" width="26" height="26" className={className}>
          <path {...common} d="M2 16 H8 M24 16 H30" />
          <circle {...common} cx="16" cy="16" r="8" />
          <text x="16" y="20.5" textAnchor="middle" fontSize="11" fill={stroke} stroke="none" fontWeight={700}>M</text>
        </svg>
      );
    case "ammeter":
      return (
        <svg viewBox="0 0 32 32" width="26" height="26" className={className}>
          <path {...common} d="M2 16 H8 M24 16 H30" />
          <circle {...common} cx="16" cy="16" r="8" />
          <text x="16" y="20.5" textAnchor="middle" fontSize="11" fill={stroke} stroke="none" fontWeight={700}>A</text>
        </svg>
      );
    case "voltmeter":
      return (
        <svg viewBox="0 0 32 32" width="26" height="26" className={className}>
          <path {...common} d="M2 16 H8 M24 16 H30" />
          <circle {...common} cx="16" cy="16" r="8" />
          <text x="16" y="20.5" textAnchor="middle" fontSize="11" fill={stroke} stroke="none" fontWeight={700}>V</text>
        </svg>
      );
    case "led":
      return (
        <svg viewBox="0 0 44 30" width="40" height="26" className={className}>
          <path {...common} d="M2 17 H14 M30 17 H42" />
          <path {...common} d="M14 9 L14 25 L28 17 Z" fill={active ? stroke : "none"} fillOpacity={active ? 0.35 : 0} />
          <path {...common} d="M28 9 V25" />
          {/* light-emission arrows — the standard LED-vs-diode symbol distinction */}
          <path {...common} d="M22 3 L27 -1 M22 3 L20 3 M22 3 L22 5" />
          <path {...common} d="M27 7 L32 3 M27 7 L25 7 M27 7 L27 9" />
        </svg>
      );
  }
}
