-- CreateTable
CREATE TABLE "DsaAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemSlug" TEXT NOT NULL,
    "language" TEXT,
    "code" TEXT NOT NULL,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "review" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DsaAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DsaAttempt_userId_createdAt_idx" ON "DsaAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DsaAttempt_userId_problemSlug_idx" ON "DsaAttempt"("userId", "problemSlug");

-- AddForeignKey
ALTER TABLE "DsaAttempt" ADD CONSTRAINT "DsaAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
