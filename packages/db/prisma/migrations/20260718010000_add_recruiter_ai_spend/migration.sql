-- CreateTable
CREATE TABLE "RecruiterAiSpend" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "jobPostingId" TEXT,
    "costCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruiterAiSpend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecruiterAiSpend_recruiterId_createdAt_idx" ON "RecruiterAiSpend"("recruiterId", "createdAt");

-- AddForeignKey
ALTER TABLE "RecruiterAiSpend" ADD CONSTRAINT "RecruiterAiSpend_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "Recruiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
