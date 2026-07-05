import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@studentos/db";

const DEFAULT_MAX_CONCURRENT_SESSIONS = 1;
const SETTING_KEY = "MAX_CONCURRENT_SESSIONS";
/** Re-check at most this often per user — avoids a Clerk API round-trip on every page load. */
const CHECK_THROTTLE_MS = 2 * 60 * 1000;

/** Admin-configurable cap on concurrent active sessions per account (anti account-sharing). */
export async function getMaxConcurrentSessions(): Promise<number> {
  const row = await prisma.platformSetting.findUnique({ where: { key: SETTING_KEY } });
  const n = row ? Number(row.value) : NaN;
  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_MAX_CONCURRENT_SESSIONS;
}

export async function setMaxConcurrentSessions(n: number): Promise<void> {
  const value = String(Math.max(1, Math.round(n)));
  await prisma.platformSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value },
    update: { value },
  });
}

/**
 * Enforce the concurrent-session cap for a signed-in Clerk user: if they have more ACTIVE
 * sessions than the configured limit, revoke the oldest (by lastActiveAt) beyond the limit. This
 * is the anti-account-sharing control — a class sharing one login gets kicked down to N devices.
 * Throttled via User.sessionCheckedAt so it costs at most one Clerk API call per user per
 * CHECK_THROTTLE_MS, not one per request.
 */
export async function enforceConcurrentSessionLimit(dbUserId: string, clerkUserId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: dbUserId }, select: { sessionCheckedAt: true } });
  if (user?.sessionCheckedAt && Date.now() - new Date(user.sessionCheckedAt).getTime() < CHECK_THROTTLE_MS) return;

  // Mark checked immediately (best-effort) so concurrent requests don't all hit Clerk at once.
  await prisma.user.update({ where: { id: dbUserId }, data: { sessionCheckedAt: new Date() } }).catch(() => {});

  try {
    const limit = await getMaxConcurrentSessions();
    const client = await clerkClient();
    const { data: sessions } = await client.sessions.getSessionList({ userId: clerkUserId, status: "active" });
    if (sessions.length <= limit) return;

    const sorted = [...sessions].sort((a, b) => b.lastActiveAt - a.lastActiveAt);
    const toRevoke = sorted.slice(limit);
    await Promise.all(toRevoke.map((s) => client.sessions.revokeSession(s.id).catch(() => {})));
  } catch {
    // Best-effort: never block the request on Clerk API trouble.
  }
}

export type SessionSummary = {
  id: string;
  lastActiveAt: number;
  createdAt: number;
  ipAddress?: string;
  city?: string;
  country?: string;
  browserName?: string;
  deviceType?: string;
  isMobile?: boolean;
};

/** List active sessions for a user — used by the admin device/session panel. */
export async function listActiveSessions(clerkUserId: string): Promise<SessionSummary[]> {
  const client = await clerkClient();
  const { data: sessions } = await client.sessions.getSessionList({ userId: clerkUserId, status: "active" });
  return sessions
    .map((s) => ({
      id: s.id,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      ipAddress: s.latestActivity?.ipAddress,
      city: s.latestActivity?.city,
      country: s.latestActivity?.country,
      browserName: s.latestActivity?.browserName,
      deviceType: s.latestActivity?.deviceType,
      isMobile: s.latestActivity?.isMobile,
    }))
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

/** Revoke one session (admin "log this device out" action). */
export async function revokeSession(sessionId: string): Promise<void> {
  const client = await clerkClient();
  await client.sessions.revokeSession(sessionId);
}
