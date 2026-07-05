-- Generic branch-solver infra: one DocumentType covers every numerical branch solver
-- (mech-solver, structural-checker, ee-solver, ece-solver, chem-solver, boq-estimator), plus a
-- separate DRAWING_VIVA type for the vision Q&A tool. `Document.feature` disambiguates which
-- tool produced a given document. Applied via `prisma db push` (see the 20260705161558 migration
-- header for why `migrate dev`'s shadow DB can't replay this history), recorded here for history.

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'BRANCH_SOLVER';
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'DRAWING_VIVA';

-- AlterEnum
ALTER TYPE "UsageKind" ADD VALUE IF NOT EXISTS 'BRANCH_SOLVER';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "feature" TEXT;
