-- Admin platform features: cost tracking, concurrent-session cap, payments.
-- NOTE: applied to the dev database via `prisma db push` during development, then recorded here
-- for migration history / future deploys. Assumes any *unrelated* pre-existing drift (columns
-- added before this migration, e.g. User.githubUrl/gpa) is reconciled separately — this script
-- only covers the schema changes made for the admin cost/session/payments work.

-- GenerationJob.costCents: backfill existing NULLs, then enforce NOT NULL with a default.
UPDATE "GenerationJob" SET "costCents" = 0 WHERE "costCents" IS NULL;
ALTER TABLE "GenerationJob" ALTER COLUMN "costCents" SET NOT NULL;
ALTER TABLE "GenerationJob" ALTER COLUMN "costCents" SET DEFAULT 0;

-- User: throttle timestamp for the concurrent-session enforcement check.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionCheckedAt" TIMESTAMP(3);

-- Platform-wide admin-editable settings (currently just MAX_CONCURRENT_SESSIONS).
CREATE TABLE IF NOT EXISTS "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- Subscription: distinguish "still active until period end" from "will auto-renew".
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

-- Payment history / receipts, populated by the Razorpay webhook.
DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('CAPTURED', 'FAILED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT NOT NULL,
    "razorpayOrderId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL,
    "method" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");
CREATE INDEX IF NOT EXISTS "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");

DO $$ BEGIN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
