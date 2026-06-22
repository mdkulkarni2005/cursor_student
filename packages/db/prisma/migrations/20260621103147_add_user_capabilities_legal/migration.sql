-- AlterTable
ALTER TABLE "User" ADD COLUMN     "acceptedLegalAt" TIMESTAMP(3),
ADD COLUMN     "appOpens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "codingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);
