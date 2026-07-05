import "server-only";
import { currentUser } from "@clerk/nextjs/server";

/**
 * Two admin tiers, both stored in Clerk publicMetadata.role — same flag/instance as apps/web's
 * /admin guard. "super-admin" can additionally manage other admins (see /admins); "admin" (the
 * original flat role, kept for backward compatibility with already-provisioned accounts) gets
 * everything else. Users can't self-promote — only settable from the Clerk dashboard/backend or
 * by an existing super-admin via /admins.
 */
export type AdminRole = "admin" | "super-admin";

function roleOf(publicMetadata: unknown): AdminRole | null {
  const role = (publicMetadata as { role?: string } | null)?.role;
  return role === "admin" || role === "super-admin" ? role : null;
}

export async function isAdmin(): Promise<boolean> {
  const user = await currentUser();
  return roleOf(user?.publicMetadata) !== null;
}

export async function isSuperAdmin(): Promise<boolean> {
  const user = await currentUser();
  return roleOf(user?.publicMetadata) === "super-admin";
}

export type AdminGuardResult =
  | { ok: true; role: AdminRole }
  | { ok: false; reason: "signed-out" | "not-admin" | "not-super-admin" };

/** Server-side guard for admin pages/actions (either tier). Does not redirect — callers render the reason. */
export async function requireAdmin(): Promise<AdminGuardResult> {
  const user = await currentUser();
  if (!user) return { ok: false, reason: "signed-out" };
  const role = roleOf(user.publicMetadata);
  if (!role) return { ok: false, reason: "not-admin" };
  return { ok: true, role };
}

/** Stricter guard for admin-management pages (/admins) — super-admin only. */
export async function requireSuperAdmin(): Promise<AdminGuardResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  if (guard.role !== "super-admin") return { ok: false, reason: "not-super-admin" };
  return guard;
}
