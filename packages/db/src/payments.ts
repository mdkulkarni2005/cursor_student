import { prisma } from "./index";

const PAYMENTS_ENABLED_KEY = "PAYMENTS_ENABLED";

/**
 * Admin-controlled master switch for real checkout (see apps/admin/app/platform's "Payments"
 * card). Gates the Razorpay checkout entry points in BOTH apps/web and apps/recruiter — the
 * PlanTier/pricing data and manual admin plan grants are unaffected either way. Defaults to OFF
 * (fail closed) when the setting has never been set, so a fresh deploy never accidentally takes
 * real payments before an admin explicitly turns it on.
 */
export async function arePaymentsEnabled(): Promise<boolean> {
  const row = await prisma.platformSetting.findUnique({ where: { key: PAYMENTS_ENABLED_KEY } });
  return row?.value === "true";
}

export async function setPaymentsEnabled(enabled: boolean): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key: PAYMENTS_ENABLED_KEY },
    create: { key: PAYMENTS_ENABLED_KEY, value: String(enabled) },
    update: { value: String(enabled) },
  });
}
