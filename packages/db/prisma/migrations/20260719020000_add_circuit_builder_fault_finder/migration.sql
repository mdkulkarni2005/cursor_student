-- CreateTable
CREATE TABLE "CircuitDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canvas" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircuitDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaultFinderAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenarioSlug" TEXT NOT NULL,
    "guessComponentId" TEXT NOT NULL,
    "guessFaultType" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaultFinderAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CircuitDraft_userId_key" ON "CircuitDraft"("userId");

-- CreateIndex
CREATE INDEX "FaultFinderAttempt_userId_createdAt_idx" ON "FaultFinderAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FaultFinderAttempt_userId_scenarioSlug_idx" ON "FaultFinderAttempt"("userId", "scenarioSlug");

-- AddForeignKey
ALTER TABLE "CircuitDraft" ADD CONSTRAINT "CircuitDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaultFinderAttempt" ADD CONSTRAINT "FaultFinderAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
