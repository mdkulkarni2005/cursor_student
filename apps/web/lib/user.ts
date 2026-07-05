import "server-only";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma, type User } from "@studentos/db";
import type { ShellUser } from "@/components/app-shell";
import { hasJoinableRealInterview } from "@/lib/real-interview";
import { enforceConcurrentSessionLimit } from "@/lib/sessions";

const PLAN_LABEL: Record<string, string> = {  FREE: "Free", PRO: "Pro", PREMIUM: "Premium" };
const ACTIVITY_STALE_MS = 30 * 60 * 1000; // bump "last seen" / opens at most twice an hour per user

/** Opportunistic, throttled activity metric for the admin panel (one write per ~session). */
async function bumpActivity(user: User): Promise<void> {
  if (user.lastSeenAt && Date.now() - new Date(user.lastSeenAt).getTime() < ACTIVITY_STALE_MS) return;
  await prisma.user
    .update({ where: { id: user.id }, data: { lastSeenAt: new Date(), appOpens: { increment: 1 } } })
    .catch(() => {});
}

/**
 * Returns the Vidyas OS DB user for the signed-in Clerk user, creating the row
 * on first sight (lazy upsert). This keeps Clerk as the source of truth for auth
 * while our Neon `User` table owns academic context (department, semester, plan).
 *
 * A suspended user (admin-set hold, see apps/admin) is treated as if signed out — every API
 * route already does `if (!user) return 401`, so this is the single point that makes a
 * suspension actually block credit-consuming requests, not just page navigation. Pages that want
 * the friendlier "/suspended" message (instead of bouncing to sign-in) check separately in
 * requireOnboardedUser below.
 *
 * Later hardening: also sync via a Clerk `user.created` webhook so the row exists
 * even before the user's first authenticated page load.
 */
export async function getOrCreateUser(existingLookup?: User | null): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  // Fast path: caller already looked up this clerkId (e.g. requireOnboardedUser) — reuse it
  // instead of round-tripping to Neon a second time for the same row.
  const existing = existingLookup !== undefined ? existingLookup : await prisma.user.findUnique({ where: { clerkId: userId } });
  if (existing) {
    if (existing.suspended) return null;
    await bumpActivity(existing);
    // Anti account-sharing: cap concurrent devices, kicking the oldest session beyond the limit.
    // Throttled internally (checks a DB timestamp first) so this only calls the Clerk API on the
    // rare request that crosses the throttle window — awaited because serverless functions don't
    // outlive the response, so a fire-and-forget call here could get killed before it runs.
    await enforceConcurrentSessionLimit(existing.id, userId).catch(() => {});
    return existing;
  }

  const cu = await currentUser();
  const email =
    cu?.primaryEmailAddress?.emailAddress ??
    cu?.emailAddresses?.[0]?.emailAddress ??
    `${userId}@placeholder.local`;
  const name = cu?.firstName ? `${cu.firstName} ${cu.lastName ?? ""}`.trim() : null;

  // Edge case: the Clerk user was deleted and re-created (e.g. developer deleted the user
  // from Clerk dashboard). The old DB row still exists with the same email but a different
  // clerkId. Re-claim the row by matching on email instead of clerkId.
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    // Update the stale row with the new clerkId so subsequent requests hit the fast path.
    const updated = await prisma.user.update({
      where: { id: byEmail.id },
      data: { clerkId: userId, name: name ?? byEmail.name },
    });
    await bumpActivity(updated);
    return updated;
  }

  // Truly new user — create the row.
  return prisma.user.upsert({
    where: { clerkId: userId },
    create: { clerkId: userId, email, name },
    update: {},
  });
}

/** For protected pages: returns the onboarded user, or redirects to sign-in / onboarding. */
export async function requireOnboardedUser(): Promise<User> {
  // getOrCreateUser() returns null for a suspended user (see its docstring) — check suspension
  // directly first so we can send them to the friendlier "/suspended" page instead of "/sign-in".
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const raw = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (raw?.suspended) redirect("/suspended");

  const user = await getOrCreateUser(raw);
  if (!user) redirect("/sign-in");
  if (!user.onboardedAt) redirect("/onboarding");
  return user;
}

/**
 * For pages that are student-only self-serve tools (assignments, planner, ppt, projects,
 * reports, resume, vault, viva, workspace) — a PROFESSIONAL user is bounced to /interview
 * instead of rendering. Mirrors requireOnboardedUser's per-page guard pattern (no middleware.ts
 * in this app) rather than duplicating the redirect at every call site.
 */
export async function requireStudentRoute(): Promise<User> {
  const user = await requireOnboardedUser();
  if (user.userType === "PROFESSIONAL") redirect("/interview");
  return user;
}

/** Maps the DB user to the shape the app shell needs. */
export async function shellUserFrom(user: User): Promise<ShellUser> {
  return {
    name: user.name ?? "Student",
    department: user.department,
    semester: user.semester,
    plan: PLAN_LABEL[user.plan] ?? "Free",
    codingEnabled: user.codingEnabled !== false,
    hasJoinableRealInterview: await hasJoinableRealInterview(user.id),
    userType: user.userType,
  };
}
