"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/audit";
import { setMaxConcurrentSessions } from "@/lib/sessions";

export async function updateMaxConcurrentSessions(n: number): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");
  if (!Number.isFinite(n) || n < 1) throw new Error("Invalid limit");

  await setMaxConcurrentSessions(n);
  await logAdminAction({
    action: "platform.max_concurrent_sessions.set",
    targetType: "platform",
    targetId: "MAX_CONCURRENT_SESSIONS",
    after: { value: n },
  });

  revalidatePath("/platform");
}
