/**
 * Ported from apps/web/app/globals.css `@theme` block — light mode only (mobile is light-only
 * today, see app.json userInterfaceStyle). Keep these values in sync with web's tokens; don't
 * invent new colors here.
 */
export const colors = {
  canvas: "#f7f7f7",
  base: "#ffffff",
  surface: "#f2f4f6",
  card: "#ffffff",
  raised: "#eceef0",
  input: "#ffffff",

  cyan: "#f6921e", // primary orange (web's `cyan` token repoints to orange)
  indigo: "#F7C131", // golden accent companion
  primaryDeep: "#d97a10",
  teal: "#006a61",
  tealSoft: "#86f2e4",
  onAccent: "#ffffff",

  success: "#059669",
  warning: "#d97706",
  danger: "#ba1a1a",

  ink: "#152241",
  soft: "#000000",
  muted: "#5c5555",
  faint: "#858585",
  dim: "#a7a7a7",

  line: "rgba(15, 23, 42, 0.08)",
  lineStrong: "rgba(15, 23, 42, 0.12)",

  // Icon-badge tints — web's `bg-{accent}/12` etc, ported to flat RGBA since RN has no opacity utilities.
  cyanTint: "rgba(246, 146, 30, 0.12)",
  tealTint: "rgba(0, 106, 97, 0.12)",
  indigoTint: "rgba(217, 122, 16, 0.15)",
  successTint: "rgba(5, 150, 105, 0.12)",
  dangerTint: "rgba(186, 26, 26, 0.12)",
} as const;

export const gradient = {
  colors: [colors.cyan, colors.indigo] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const font = {
  display: "Inter_700Bold",
  displaySemibold: "Inter_600SemiBold",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemibold: "Inter_600SemiBold",
};

export const shadow = {
  card: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};
