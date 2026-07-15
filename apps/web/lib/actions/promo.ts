"use server";

import { prisma, Prisma } from "@studentos/db";
import { requireOnboardedUser } from "@/lib/user";

export type RedeemPromoResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Redeems a PromoCode for the signed-in student — enforced once per account via the
 * PromoRedemption unique constraint (promoCodeId, userId), not just an application-level check,
 * so a race (double-click) can't double-redeem.
 *
 * Only FREE_TRIAL_EXTENSION is applied automatically here (extends User.trialEndsAt). PERCENT_OFF
 * / AMOUNT_OFF codes are recorded as redeemed but not yet wired into the checkout amount — that
 * needs a promo-code field threaded through lib/actions/checkout.ts, left for when discount
 * checkout is actually needed.
 */
export async function redeemPromoCode(rawCode: string): Promise<RedeemPromoResult> {
  const user = await requireOnboardedUser();
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a code." };

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.active) return { ok: false, error: "Invalid or expired code." };
  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) return { ok: false, error: "This code has expired." };
  if (promo.maxRedemptions !== null && promo.redemptions >= promo.maxRedemptions) {
    return { ok: false, error: "This code has reached its redemption limit." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.promoRedemption.create({ data: { promoCodeId: promo.id, userId: user.id } });
      await tx.promoCode.update({ where: { id: promo.id }, data: { redemptions: { increment: 1 } } });

      if (promo.discountType === "FREE_TRIAL_EXTENSION") {
        const base = user.trialEndsAt && user.trialEndsAt.getTime() > Date.now() ? user.trialEndsAt : new Date();
        const trialEndsAt = new Date(base.getTime() + promo.value * 24 * 60 * 60 * 1000);
        await tx.user.update({ where: { id: user.id }, data: { trialEndsAt } });
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "You've already redeemed this code." };
    }
    throw err;
  }

  return { ok: true, message: "Code redeemed." };
}
