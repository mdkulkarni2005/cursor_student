-- AlterEnum
ALTER TYPE "UsageKind" ADD VALUE 'SYSTEM_DESIGN';

-- CreateTable
CREATE TABLE "SystemDesignAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenarioSlug" TEXT NOT NULL,
    "canvas" JSONB NOT NULL,
    "review" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemDesignAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemDesignAttempt_userId_createdAt_idx" ON "SystemDesignAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SystemDesignAttempt_userId_scenarioSlug_idx" ON "SystemDesignAttempt"("userId", "scenarioSlug");

-- AddForeignKey
ALTER TABLE "SystemDesignAttempt" ADD CONSTRAINT "SystemDesignAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
