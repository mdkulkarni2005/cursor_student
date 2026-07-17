"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/audit";
import { setAdminRoleByEmail, revokeAdminRole } from "@/lib/admins";
import type { AdminRole } from "@/lib/admin";

export async function inviteAdmin(email: string, role: AdminRole): Promise<void> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) throw new Error("Not authorized — super-admin only");

  await setAdminRoleByEmail(email.trim().toLowerCase(), role);
  await logAdminAction({
    action: "admin.role.set",
    targetType: "admin",
    targetId: email,
    after: { role },
  });

  revalidatePath("/admins");
}

export async function removeAdmin(clerkId: string, email: string): Promise<void> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) throw new Error("Not authorized — super-admin only");

  await revokeAdminRole(clerkId);
  await logAdminAction({
    action: "admin.role.revoke",
    targetType: "admin",
    targetId: email,
  });

  revalidatePath("/admins");
}
