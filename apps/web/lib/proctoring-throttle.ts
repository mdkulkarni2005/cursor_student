/** Pure, no DOM/browser SDK dependency — safe to import from a Node verify script. */
export type FlagKind = "FULLSCREEN_EXIT" | "TAB_HIDDEN" | "CAMERA_OFF" | "MULTI_MONITOR";

export const FLAG_THROTTLE_MS: Record<FlagKind, number> = {
  FULLSCREEN_EXIT: 20_000,
  TAB_HIDDEN: 20_000,
  CAMERA_OFF: 20_000,
  // Sent at most once per session by the caller — this throttle is a second guard.
  MULTI_MONITOR: Number.POSITIVE_INFINITY,
};

/** Returns true if `kind` hasn't been sent (or its throttle window has elapsed). */
export function shouldSendFlag(
  lastSent: Map<FlagKind, number>,
  kind: FlagKind,
  now: number,
  throttleMs: number = FLAG_THROTTLE_MS[kind],
): boolean {
  const last = lastSent.get(kind);
  if (last !== undefined && now - last < throttleMs) return false;
  return true;
}
