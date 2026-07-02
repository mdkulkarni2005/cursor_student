import "server-only";
import { currentUser } from "@clerk/nextjs/server";

/**
 * Admin access is granted ONLY via Clerk publicMetadata `role: "admin"`, set from the Clerk
 * dashboard/backend — same flag and same Clerk instance as apps/web's /admin guard. Users
 * can't self-promote.
 */
export async function isAdmin(): Promise<boolean> {
  const user = await currentUser();
  return user?.publicMetadata?.role === "admin";
}

export type AdminGuardResult =
  | { ok: true }
  | { ok: false; reason: "signed-out" | "not-admin" };

/** Server-side guard for admin pages/actions. Does not redirect — callers render the reason. */
export async function requireAdmin(): Promise<AdminGuardResult> {
  const user = await currentUser();
  if (!user) return { ok: false, reason: "signed-out" };
  if (user.publicMetadata?.role !== "admin") return { ok: false, reason: "not-admin" };
  return { ok: true };
}
