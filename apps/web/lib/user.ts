import "server-only";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma, type User } from "@studentos/db";
import type { ShellUser } from "@/components/app-shell";

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
 * Later hardening: also sync via a Clerk `user.created` webhook so the row exists
 * even before the user's first authenticated page load.
 */
export async function getOrCreateUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  // Fast path: user already exists with this clerkId.
  const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (existing) {
    await bumpActivity(existing);
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
  const user = await getOrCreateUser();
  if (!user) redirect("/sign-in");
  if (!user.onboardedAt) redirect("/onboarding");
  return user;
}

/** Maps the DB user to the shape the app shell needs. */
export function shellUserFrom(user: User): ShellUser {
  return {
    name: user.name ?? "Student",
    department: user.department,
    semester: user.semester,
    plan: PLAN_LABEL[user.plan] ?? "Free",
    codingEnabled: user.codingEnabled !== false,
  };
}
