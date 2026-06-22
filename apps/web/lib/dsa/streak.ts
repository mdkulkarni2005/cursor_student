/**
 * Streak math — DERIVED from attempt timestamps, never a stored counter (counters drift).
 * "Daily" means IST (Asia/Kolkata, UTC+5:30, no DST): a 1am-IST solve must count as today,
 * not yesterday-UTC. We bucket each timestamp into an IST "day number" and count consecutive
 * days ending today or yesterday (a streak stays "alive" through yesterday).
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Whole-day index in IST (days since epoch). */
export function istDayNumber(d: Date): number {
  return Math.floor((d.getTime() + IST_OFFSET_MS) / 86_400_000);
}

export type StreakInfo = { current: number; practicedToday: boolean; alive: boolean };

export function computeStreak(timestamps: Date[], now: Date = new Date()): StreakInfo {
  const today = istDayNumber(now);
  const days = new Set(timestamps.map(istDayNumber));

  const practicedToday = days.has(today);
  // Anchor on today if practiced, else yesterday (streak still alive, must solve today to keep it).
  let anchor: number | null = null;
  if (days.has(today)) anchor = today;
  else if (days.has(today - 1)) anchor = today - 1;

  if (anchor === null) return { current: 0, practicedToday: false, alive: false };

  let current = 0;
  let d = anchor;
  while (days.has(d)) {
    current++;
    d--;
  }
  return { current, practicedToday, alive: true };
}
