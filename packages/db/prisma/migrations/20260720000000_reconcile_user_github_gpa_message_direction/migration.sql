-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('RECRUITER_TO_STUDENT', 'STUDENT_TO_RECRUITER');

-- AlterEnum
ALTER TYPE "InterviewScheduleStatus" ADD VALUE 'RESCHEDULE_DECLINED';

-- AlterTable
ALTER TABLE "RecruiterMessage" ADD COLUMN     "direction" "MessageDirection" NOT NULL DEFAULT 'RECRUITER_TO_STUDENT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "githubUrl" TEXT,
ADD COLUMN     "gpa" DOUBLE PRECISION;

