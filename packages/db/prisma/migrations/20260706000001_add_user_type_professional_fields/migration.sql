-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('STUDENT', 'PROFESSIONAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "userType" "UserType" NOT NULL DEFAULT 'STUDENT',
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "yearsOfExperience" INTEGER,
ADD COLUMN     "linkedin" TEXT;
