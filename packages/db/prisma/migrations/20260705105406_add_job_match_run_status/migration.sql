-- CreateEnum
CREATE TYPE "JobMatchRunStatus" AS ENUM ('IDLE', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "matchError" TEXT,
ADD COLUMN     "matchFinishedAt" TIMESTAMP(3),
ADD COLUMN     "matchStartedAt" TIMESTAMP(3),
ADD COLUMN     "matchStatus" "JobMatchRunStatus" NOT NULL DEFAULT 'IDLE';
