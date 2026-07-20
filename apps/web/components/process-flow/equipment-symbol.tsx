import type { EquipmentKind } from "@/lib/process-flow/types";

/** Simple schematic-style process equipment symbols — pure inline SVG, themes with currentColor. */
export function EquipmentSymbol({ kind, className = "" }: { kind: EquipmentKind; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (kind) {
    case "reactor":
      return (
        <svg viewBox="0 0 40 40" width="34" height="34" className={className}>
          <path {...common} d="M12 6 H28 V14 L32 34 A2 2 0 01 30 36 H10 A2 2 0 01 8 34 L12 14 Z" />
          <path {...common} d="M10 6 H30" />
        </svg>
      );
    case "distillation-column":
      return (
        <svg viewBox="0 0 40 40" width="34" height="34" className={className}>
          <rect x="14" y="4" width="12" height="32" rx="2" {...common} />
          <path {...common} d="M14 12 H26 M14 20 H26 M14 28 H26" />
        </svg>
      );
    case "heat-exchanger":
      return (
        <svg viewBox="0 0 40 40" width="34" height="34" className={className}>
          <rect x="6" y="14" width="28" height="12" rx="6" {...common} />
          <path {...common} d="M10 20 H30 M14 16 V24 M20 16 V24 M26 16 V24" />
        </svg>
      );
    case "pump":
      return (
        <svg viewBox="0 0 40 40" width="34" height="34" className={className}>
          <circle cx="18" cy="20" r="12" {...common} />
          <path {...common} d="M18 12 L24 20 L18 28 Z" />
          <path {...common} d="M30 20 H36" />
        </svg>
      );
    case "feed":
      return (
        <svg viewBox="0 0 40 40" width="34" height="34" className={className}>
          <path {...common} d="M4 20 H28 M20 12 L28 20 L20 28" />
          <path {...common} d="M32 10 V30" />
        </svg>
      );
    case "product":
      return (
        <svg viewBox="0 0 40 40" width="34" height="34" className={className}>
          <path {...common} d="M8 10 V30" />
          <path {...common} d="M12 20 H36 M28 12 L36 20 L28 28" />
        </svg>
      );
  }
}
