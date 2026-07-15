"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/audit";

const DISCOUNT_TYPES = ["FREE_TRIAL_EXTENSION", "PERCENT_OFF", "AMOUNT_OFF"] as const;

export async function createPromoCode(formData: FormData): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code || !/^[A-Z0-9-]+$/.test(code)) throw new Error("Code must be letters, numbers, and hyphens only");

  const discountType = String(formData.get("discountType") ?? "");
  if (!DISCOUNT_TYPES.includes(discountType as (typeof DISCOUNT_TYPES)[number])) throw new Error("Invalid discount type");

  const value = Math.max(0, Math.round(Number(formData.get("value")) || 0));
  const description = String(formData.get("description") ?? "").trim() || null;
  const planTierId = String(formData.get("planTierId") ?? "").trim() || null;
  const maxRedemptionsRaw = String(formData.get("maxRedemptions") ?? "").trim();
  const maxRedemptions = maxRedemptionsRaw ? Math.max(1, Math.round(Number(maxRedemptionsRaw))) : null;
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  const promo = await prisma.promoCode.create({
    data: { code, discountType, value, description, planTierId, maxRedemptions, expiresAt },
  });

  await logAdminAction({
    action: "promo_code.create",
    targetType: "PromoCode",
    targetId: promo.id,
    after: { code, discountType, value, planTierId, maxRedemptions, expiresAt },
  });

  revalidatePath("/promo-codes");
}

export async function setPromoCodeActive(id: string, active: boolean): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");

  await prisma.promoCode.update({ where: { id }, data: { active } });
  await logAdminAction({
    action: active ? "promo_code.activate" : "promo_code.deactivate",
    targetType: "PromoCode",
    targetId: id,
    after: { active },
  });

  revalidatePath("/promo-codes");
}
