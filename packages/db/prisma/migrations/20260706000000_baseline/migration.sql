-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ASSIGNMENT', 'REPORT', 'PPT', 'PROJECT', 'VIVA', 'RESUME', 'INTERVIEW');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'QUEUED', 'GENERATING', 'NEEDS_INPUT', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('REPORT', 'PPT', 'RESUME');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('DOCX', 'PPTX', 'PDF');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'NEEDS_INPUT', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "UploadKind" AS ENUM ('PHOTO', 'PDF', 'IMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "UsageKind" AS ENUM ('ASSIGNMENT', 'REPORT', 'PPT');

-- CreateEnum
CREATE TYPE "RecruiterStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InterviewScheduleStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'DECLINED', 'RESCHEDULE_REQUESTED', 'CANCELED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InterviewOutcome" AS ENUM ('SELECTED', 'REJECTED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "InterviewRoomStatus" AS ENUM ('PENDING', 'ACTIVE', 'ENDED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "InterviewFlagKind" AS ENUM ('FULLSCREEN_EXIT', 'TAB_HIDDEN', 'CAMERA_OFF', 'MIC_OFF', 'MULTI_MONITOR', 'COPY_PASTE_ATTEMPT');

-- CreateEnum
CREATE TYPE "JobPostingStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "JobMatchRunStatus" AS ENUM ('IDLE', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "SandboxStatus" AS ENUM ('PENDING', 'RUNNING', 'STOPPED', 'UNAVAILABLE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "department" TEXT,
    "semester" TEXT,
    "careerGoal" TEXT,
    "publicHandle" TEXT,
    "onboardedAt" TIMESTAMP(3),
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "codingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "acceptedLegalAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "appOpens" INTEGER NOT NULL DEFAULT 0,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "suspendedAt" TIMESTAMP(3),
    "pregeneratedIdeas" JSONB,
    "pregeneratedIdeasAt" TIMESTAMP(3),
    "institutionId" TEXT,
    "phone" TEXT,
    "visibleToRecruiters" BOOLEAN NOT NULL DEFAULT true,
    "visibleToRecruitersAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "university" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "name" TEXT NOT NULL,
    "institutionId" TEXT,
    "storageKey" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "placeholders" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "semester" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "workspaceId" TEXT,
    "subjectId" TEXT,
    "templateId" TEXT,
    "quality" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentContent" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentExport" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "model" TEXT,
    "inputRefs" JSONB,
    "pending" JSONB,
    "error" TEXT,
    "costCents" INTEGER,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "documentId" TEXT,
    "storageKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "kind" "UploadKind" NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VivaSet" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VivaSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "razorpaySubId" TEXT,
    "razorpayCustomerId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "UsageKind" NOT NULL,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DsaAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemSlug" TEXT NOT NULL,
    "language" TEXT,
    "code" TEXT NOT NULL,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "review" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DsaAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deadline" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'other',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetExam" TEXT NOT NULL,
    "examDate" TIMESTAMP(3),
    "readiness" INTEGER NOT NULL DEFAULT 0,
    "roadmap" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recruiter" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "companyEmail" TEXT,
    "industry" TEXT,
    "designation" TEXT,
    "linkedinUrl" TEXT,
    "status" "RecruiterStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionNote" TEXT,
    "approvedByEmail" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recruiter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruiterMessage" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruiterMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSchedule" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "InterviewScheduleStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposedAt" TIMESTAMP(3) NOT NULL,
    "meetingLink" TEXT,
    "note" TEXT,
    "studentNote" TEXT,
    "outcome" "InterviewOutcome",
    "outcomeNote" TEXT,
    "jobPostingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewRoom" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "livekitRoom" TEXT NOT NULL,
    "status" "InterviewRoomStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "finalCode" TEXT,
    "candidateReadyAt" TIMESTAMP(3),
    "admittedAt" TIMESTAMP(3),
    "candidateChecks" JSONB,

    CONSTRAINT "InterviewRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewFlag" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "kind" "InterviewFlagKind" NOT NULL,
    "detail" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewTranscriptLine" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewTranscriptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewJudgment" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "fitVerdict" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "concerns" JSONB NOT NULL,
    "recommendation" TEXT NOT NULL,
    "score" INTEGER,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewJudgment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "department" TEXT,
    "status" "JobPostingStatus" NOT NULL DEFAULT 'OPEN',
    "matchStatus" "JobMatchRunStatus" NOT NULL DEFAULT 'IDLE',
    "matchError" TEXT,
    "matchStartedAt" TIMESTAMP(3),
    "matchFinishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobMatch" (
    "id" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "matchPercent" INTEGER NOT NULL,
    "rationale" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSandbox" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "sandboxId" TEXT NOT NULL,
    "status" "SandboxStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "InterviewSandbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_publicHandle_key" ON "User"("publicHandle");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_institutionId_idx" ON "User"("institutionId");

-- CreateIndex
CREATE INDEX "User_visibleToRecruiters_idx" ON "User"("visibleToRecruiters");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_name_university_key" ON "Institution"("name", "university");

-- CreateIndex
CREATE INDEX "Template_type_institutionId_idx" ON "Template"("type", "institutionId");

-- CreateIndex
CREATE INDEX "Workspace_userId_idx" ON "Workspace"("userId");

-- CreateIndex
CREATE INDEX "Subject_workspaceId_idx" ON "Subject"("workspaceId");

-- CreateIndex
CREATE INDEX "Document_ownerId_type_idx" ON "Document"("ownerId", "type");

-- CreateIndex
CREATE INDEX "Document_ownerId_status_idx" ON "Document"("ownerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentContent_documentId_key" ON "DocumentContent"("documentId");

-- CreateIndex
CREATE INDEX "DocumentExport_documentId_idx" ON "DocumentExport"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationJob_documentId_key" ON "GenerationJob"("documentId");

-- CreateIndex
CREATE INDEX "Upload_ownerId_idx" ON "Upload"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "VivaSet_documentId_key" ON "VivaSet"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_razorpaySubId_key" ON "Subscription"("razorpaySubId");

-- CreateIndex
CREATE INDEX "UsageEvent_userId_kind_createdAt_idx" ON "UsageEvent"("userId", "kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssistantThread_userId_key" ON "AssistantThread"("userId");

-- CreateIndex
CREATE INDEX "DsaAttempt_userId_createdAt_idx" ON "DsaAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DsaAttempt_userId_problemSlug_idx" ON "DsaAttempt"("userId", "problemSlug");

-- CreateIndex
CREATE INDEX "Deadline_userId_dueAt_idx" ON "Deadline"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "StudyPlan_userId_createdAt_idx" ON "StudyPlan"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetType_targetId_idx" ON "AdminAuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Recruiter_clerkId_key" ON "Recruiter"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "Recruiter_email_key" ON "Recruiter"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Recruiter_phone_key" ON "Recruiter"("phone");

-- CreateIndex
CREATE INDEX "Recruiter_status_idx" ON "Recruiter"("status");

-- CreateIndex
CREATE INDEX "Recruiter_industry_idx" ON "Recruiter"("industry");

-- CreateIndex
CREATE INDEX "RecruiterMessage_studentId_createdAt_idx" ON "RecruiterMessage"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "RecruiterMessage_recruiterId_createdAt_idx" ON "RecruiterMessage"("recruiterId", "createdAt");

-- CreateIndex
CREATE INDEX "InterviewSchedule_studentId_proposedAt_idx" ON "InterviewSchedule"("studentId", "proposedAt");

-- CreateIndex
CREATE INDEX "InterviewSchedule_recruiterId_proposedAt_idx" ON "InterviewSchedule"("recruiterId", "proposedAt");

-- CreateIndex
CREATE INDEX "InterviewSchedule_jobPostingId_idx" ON "InterviewSchedule"("jobPostingId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewRoom_scheduleId_key" ON "InterviewRoom"("scheduleId");

-- CreateIndex
CREATE INDEX "InterviewRoom_scheduleId_idx" ON "InterviewRoom"("scheduleId");

-- CreateIndex
CREATE INDEX "InterviewFlag_scheduleId_occurredAt_idx" ON "InterviewFlag"("scheduleId", "occurredAt");

-- CreateIndex
CREATE INDEX "InterviewTranscriptLine_scheduleId_occurredAt_idx" ON "InterviewTranscriptLine"("scheduleId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewJudgment_scheduleId_key" ON "InterviewJudgment"("scheduleId");

-- CreateIndex
CREATE INDEX "JobPosting_recruiterId_createdAt_idx" ON "JobPosting"("recruiterId", "createdAt");

-- CreateIndex
CREATE INDEX "JobMatch_jobPostingId_matchPercent_idx" ON "JobMatch"("jobPostingId", "matchPercent");

-- CreateIndex
CREATE UNIQUE INDEX "JobMatch_jobPostingId_studentId_key" ON "JobMatch"("jobPostingId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSandbox_scheduleId_key" ON "InterviewSandbox"("scheduleId");

-- CreateIndex
CREATE INDEX "InterviewSandbox_scheduleId_idx" ON "InterviewSandbox"("scheduleId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentContent" ADD CONSTRAINT "DocumentContent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentExport" ADD CONSTRAINT "DocumentExport_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VivaSet" ADD CONSTRAINT "VivaSet_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantThread" ADD CONSTRAINT "AssistantThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DsaAttempt" ADD CONSTRAINT "DsaAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlan" ADD CONSTRAINT "StudyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterMessage" ADD CONSTRAINT "RecruiterMessage_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "Recruiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterMessage" ADD CONSTRAINT "RecruiterMessage_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedule" ADD CONSTRAINT "InterviewSchedule_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "Recruiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedule" ADD CONSTRAINT "InterviewSchedule_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

