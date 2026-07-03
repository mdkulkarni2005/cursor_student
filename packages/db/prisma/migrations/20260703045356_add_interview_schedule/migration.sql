-- CreateEnum
CREATE TYPE "InterviewScheduleStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'DECLINED', 'RESCHEDULE_REQUESTED', 'CANCELED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InterviewOutcome" AS ENUM ('SELECTED', 'REJECTED', 'ON_HOLD');

-- CreateTable
CREATE TABLE "InterviewSchedule" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "InterviewScheduleStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposedAt" TIMESTAMP(3) NOT NULL,
    "meetingLink" TEXT,
    "note" TEXT,
    "studentNote" TEXT,
    "outcome" "InterviewOutcome",
    "outcomeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewSchedule_studentId_proposedAt_idx" ON "InterviewSchedule"("studentId", "proposedAt");

-- CreateIndex
CREATE INDEX "InterviewSchedule_recruiterId_proposedAt_idx" ON "InterviewSchedule"("recruiterId", "proposedAt");

-- AddForeignKey
ALTER TABLE "InterviewSchedule" ADD CONSTRAINT "InterviewSchedule_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "Recruiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedule" ADD CONSTRAINT "InterviewSchedule_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

