import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import type { AdminRole } from "@/lib/admin";

export type AdminListing = { clerkId: string; email: string; name: string | null; role: AdminRole };

/**
 * List every Clerk user tagged as an admin. Clerk doesn't support filtering getUserList by
 * publicMetadata server-side, so this scans up to 500 most-recently-created users and filters
 * in memory — fine at this user-base size; revisit if the user count grows into the thousands.
 */
export async function listAdmins(): Promise<AdminListing[]> {
  const client = await clerkClient();
  const { data } = await client.users.getUserList({ limit: 500, orderBy: "-created_at" });
  return data
    .map((u) => {
      const role = (u.publicMetadata as { role?: string } | null)?.role;
      if (role !== "admin" && role !== "super-admin") return null;
      return {
        clerkId: u.id,
        email: u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? "(no email)",
        name: u.firstName ? `${u.firstName} ${u.lastName ?? ""}`.trim() : null,
        role,
      };
    })
    .filter((x): x is AdminListing => x !== null);
}

/** Grant/change an admin's role by email. Merges into publicMetadata (never clobbers other flags). */
export async function setAdminRoleByEmail(email: string, role: AdminRole): Promise<void> {
  const client = await clerkClient();
  const { data } = await client.users.getUserList({ emailAddress: [email], limit: 1 });
  const user = data[0];
  if (!user) throw new Error(`No Clerk user found with email ${email}`);
  await client.users.updateUserMetadata(user.id, { publicMetadata: { role } });
}

/** Revoke admin access (clears the role field only — merge semantics keep other metadata). */
export async function revokeAdminRole(clerkId: string): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkId, { publicMetadata: { role: null } });
}
