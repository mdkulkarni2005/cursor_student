import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@studentos/db";

const DEFAULT_MAX_CONCURRENT_SESSIONS = 1;
const SETTING_KEY = "MAX_CONCURRENT_SESSIONS";

/** Admin-configurable cap on concurrent active sessions per account (enforced in apps/web). */
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

/** List active sessions for a user (by Clerk user id) — the device/session panel on /users/[id]. */
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
export async function revokeClerkSession(sessionId: string): Promise<void> {
  const client = await clerkClient();
  await client.sessions.revokeSession(sessionId);
}
