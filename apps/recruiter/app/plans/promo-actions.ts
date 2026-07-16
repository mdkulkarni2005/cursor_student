"use server";

import { prisma, Prisma } from "@studentos/db";
import { requireRecruiter } from "@/lib/recruiter";

export type RedeemPromoResult = { ok: true; message: string } | { ok: false; error: string };

/** Recruiter-side mirror of apps/web/lib/actions/promo.ts — see that file for the full explanation
 *  of what's applied automatically (FREE_TRIAL_EXTENSION) vs recorded only (PERCENT_OFF/AMOUNT_OFF). */
export async function redeemPromoCode(rawCode: string): Promise<RedeemPromoResult> {
  const guard = await requireRecruiter();
  if (!guard.ok) return { ok: false, error: "Not authorized." };
  const recruiterId = guard.recruiter.id;

  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a code." };

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.active) return { ok: false, error: "Invalid or expired code." };
  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) return { ok: false, error: "This code has expired." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.promoRedemption.create({ data: { promoCodeId: promo.id, recruiterId } });
      // Atomic conditional increment — the WHERE clause is re-evaluated against the latest
      // committed row when a concurrent redemption is mid-flight, so two requests racing near
      // maxRedemptions can't both succeed (unlike a separate read-then-write check).
      const updated = await tx.promoCode.updateMany({
        where: { id: promo.id, OR: [{ maxRedemptions: null }, { redemptions: { lt: promo.maxRedemptions ?? 2147483647 } }] },
        data: { redemptions: { increment: 1 } },
      });
      if (updated.count === 0) throw new Error("LIMIT_REACHED");

      if (promo.discountType === "FREE_TRIAL_EXTENSION") {
        const existing = await tx.recruiterSubscription.findUnique({ where: { recruiterId } });
        const base = existing?.trialEndsAt && existing.trialEndsAt.getTime() > Date.now() ? existing.trialEndsAt : new Date();
        const trialEndsAt = new Date(base.getTime() + promo.value * 24 * 60 * 60 * 1000);
        await tx.recruiterSubscription.upsert({
          where: { recruiterId },
          create: { recruiterId, trialEndsAt },
          update: { trialEndsAt },
        });
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "You've already redeemed this code." };
    }
    if (err instanceof Error && err.message === "LIMIT_REACHED") {
      return { ok: false, error: "This code has reached its redemption limit." };
    }
    throw err;
  }

  return { ok: true, message: "Code redeemed." };
}
