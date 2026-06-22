import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Admin access is granted ONLY via Clerk publicMetadata `role: "admin"`, set from the Clerk
 * dashboard/backend — users can't self-promote, and it needs no JWT-template config.
 */
export async function isAdmin(): Promise<boolean> {
  const user = await currentUser();
  return user?.publicMetadata?.role === "admin";
}

/** Server-side guard for admin-only pages. Non-admins are bounced home. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/dashboard");
}
