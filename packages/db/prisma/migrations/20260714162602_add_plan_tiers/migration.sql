-- CreateEnum
CREATE TYPE "PlanAudience" AS ENUM ('STUDENT', 'RECRUITER');

-- CreateEnum
CREATE TYPE "RecruiterUsageKind" AS ENUM ('JOB_POSTING', 'CANDIDATE_CONTACT');

-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- AlterTable
ALTER TABLE "InterviewSchedule" DROP COLUMN "recruiterNote",
DROP COLUMN "rescheduleProposedAt";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "recruiterId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "planTierId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "idCardKey" TEXT,
ADD COLUMN     "planTierId" TEXT,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "ActivityLog";

-- DropTable
DROP TABLE "Notification";

-- DropEnum
DROP TYPE "ActivityKind";

-- DropEnum
DROP TYPE "NotificationKind";

-- CreateTable
CREATE TABLE "PlanTier" (
    "id" TEXT NOT NULL,
    "audience" "PlanAudience" NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "billingPeriod" TEXT NOT NULL DEFAULT 'monthly',
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "limits" JSONB NOT NULL,
    "razorpayPlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruiterSubscription" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "planTierId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "razorpaySubId" TEXT,
    "razorpayCustomerId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruiterSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruiterUsageEvent" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "kind" "RecruiterUsageKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruiterUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "planTierId" TEXT,
    "maxRedemptions" INTEGER,
    "redemptions" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoRedemption" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "userId" TEXT,
    "recruiterId" TEXT,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanTier_audience_active_idx" ON "PlanTier"("audience", "active");

-- CreateIndex
CREATE UNIQUE INDEX "PlanTier_audience_slug_key" ON "PlanTier"("audience", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterSubscription_recruiterId_key" ON "RecruiterSubscription"("recruiterId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterSubscription_razorpaySubId_key" ON "RecruiterSubscription"("razorpaySubId");

-- CreateIndex
CREATE INDEX "RecruiterUsageEvent_recruiterId_kind_createdAt_idx" ON "RecruiterUsageEvent"("recruiterId", "kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_active_idx" ON "PromoCode"("active");

-- CreateIndex
CREATE INDEX "PromoRedemption_promoCodeId_idx" ON "PromoRedemption"("promoCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoRedemption_promoCodeId_userId_key" ON "PromoRedemption"("promoCodeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoRedemption_promoCodeId_recruiterId_key" ON "PromoRedemption"("promoCodeId", "recruiterId");

-- CreateIndex
CREATE INDEX "Payment_recruiterId_createdAt_idx" ON "Payment"("recruiterId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_planTierId_fkey" FOREIGN KEY ("planTierId") REFERENCES "PlanTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterSubscription" ADD CONSTRAINT "RecruiterSubscription_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "Recruiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterSubscription" ADD CONSTRAINT "RecruiterSubscription_planTierId_fkey" FOREIGN KEY ("planTierId") REFERENCES "PlanTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterUsageEvent" ADD CONSTRAINT "RecruiterUsageEvent_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "Recruiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_planTierId_fkey" FOREIGN KEY ("planTierId") REFERENCES "PlanTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planTierId_fkey" FOREIGN KEY ("planTierId") REFERENCES "PlanTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "Recruiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

