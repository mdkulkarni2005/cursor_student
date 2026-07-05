-- Lab Report Generator (cross-branch feature, available to all departments).
-- NOTE: applied to the dev database via `prisma db push` (the shadow database can't replay the
-- pre-existing 20260705161558_admin_platform_features migration cleanly, same caveat documented
-- in that migration's own header), then recorded here for migration history / future deploys.

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'LAB_REPORT';

-- AlterEnum
ALTER TYPE "UsageKind" ADD VALUE IF NOT EXISTS 'LAB_REPORT';
