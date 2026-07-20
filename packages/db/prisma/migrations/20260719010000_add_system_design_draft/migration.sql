-- CreateTable
CREATE TABLE "SystemDesignDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenarioSlug" TEXT NOT NULL,
    "canvas" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemDesignDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemDesignDraft_userId_scenarioSlug_key" ON "SystemDesignDraft"("userId", "scenarioSlug");

-- AddForeignKey
ALTER TABLE "SystemDesignDraft" ADD CONSTRAINT "SystemDesignDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
