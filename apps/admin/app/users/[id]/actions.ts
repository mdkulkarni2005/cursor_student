"use server";

import { revalidatePath } from "next/cache";
import { Plan, prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";

const PLAN_VALUES = new Set(Object.values(Plan));

/**
 * Manual plan override. There's no payment gateway wired up yet, so this is how a paid
 * upgrade/downgrade actually takes effect until Razorpay billing lands — admin sets the
 * plan by hand after confirming payment out-of-band.
 */
export async function setUserPlan(userId: string, plan: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");
  if (!PLAN_VALUES.has(plan as Plan)) throw new Error("Invalid plan");

  await prisma.user.update({ where: { id: userId }, data: { plan: plan as Plan } });
  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
  revalidatePath("/");
}
