-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'FEATURE_REQUEST', 'IMPROVEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'REVIEWED', 'PLANNED', 'DONE', 'DISMISSED');

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "requesterType" "SupportRequesterType" NOT NULL,
    "studentId" TEXT,
    "recruiterId" TEXT,
    "type" "FeedbackType" NOT NULL,
    "message" TEXT NOT NULL,
    "page" TEXT,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_status_createdAt_idx" ON "Feedback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Feedback_studentId_idx" ON "Feedback"("studentId");

-- CreateIndex
CREATE INDEX "Feedback_recruiterId_idx" ON "Feedback"("recruiterId");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "Recruiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

