-- AlterTable
ALTER TABLE "User" ADD COLUMN "pregeneratedIdeas" JSONB,
ADD COLUMN "pregeneratedIdeasAt" TIMESTAMP(3);
