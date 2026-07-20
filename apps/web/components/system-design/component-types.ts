/** The component palette — the "kind" values are what the AI review reasons about (packages/ai/src/system-design.ts). */
export const SYSTEM_DESIGN_COMPONENT_TYPES = [
  { kind: "load-balancer", label: "Load Balancer", emoji: "⚖️" },
  { kind: "api-server", label: "API Server", emoji: "🖥️" },
  { kind: "database", label: "Database", emoji: "🗄️" },
  { kind: "cache", label: "Cache", emoji: "⚡" },
  { kind: "queue", label: "Queue", emoji: "📬" },
] as const;

export type SystemDesignComponentKind = (typeof SYSTEM_DESIGN_COMPONENT_TYPES)[number]["kind"];

export const COMPONENT_EMOJI: Record<string, string> = Object.fromEntries(
  SYSTEM_DESIGN_COMPONENT_TYPES.map((c) => [c.kind, c.emoji]),
);
export const COMPONENT_LABEL: Record<string, string> = Object.fromEntries(
  SYSTEM_DESIGN_COMPONENT_TYPES.map((c) => [c.kind, c.label]),
);
