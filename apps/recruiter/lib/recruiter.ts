import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { prisma, type Recruiter } from "@studentos/db";

/**
 * Recruiter access is granted ONLY once apps/admin approves the application — that action sets
 * BOTH the local `Recruiter.status = APPROVED` row AND Clerk `publicMetadata.role: "recruiter"`
 * (apps/admin/app/recruiters/actions.ts). We check `currentUser()` (a live fetch, not the
 * cached session JWT) so a just-approved recruiter doesn't have to wait out a stale token.
 */
export type RecruiterGuardResult =
  | { ok: true; recruiter: Recruiter }
  | { ok: false; reason: "signed-out" | "no-application" | "draft" | "pending" | "rejected" | "suspended" };

export async function requireRecruiter(): Promise<RecruiterGuardResult> {
  const user = await currentUser();
  if (!user) return { ok: false, reason: "signed-out" };

  const recruiter = await prisma.recruiter.findUnique({ where: { clerkId: user.id } });
  if (!recruiter) return { ok: false, reason: "no-application" };
  if (recruiter.suspended) return { ok: false, reason: "suspended" };
  if (recruiter.status === "DRAFT") return { ok: false, reason: "draft" };
  if (recruiter.status === "PENDING") return { ok: false, reason: "pending" };
  if (recruiter.status === "REJECTED") return { ok: false, reason: "rejected" };

  // status === APPROVED — also require the Clerk role flag as the second factor apps/admin sets.
  if (user.publicMetadata?.role !== "recruiter") return { ok: false, reason: "pending" };

  return { ok: true, recruiter };
}
