-- AlterEnum
ALTER TYPE "DocumentStatus" ADD VALUE 'NEEDS_INPUT';

-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'NEEDS_INPUT';

-- AlterTable
ALTER TABLE "GenerationJob" ADD COLUMN     "pending" JSONB;
