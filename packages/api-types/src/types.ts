// Shared shapes for /api/mobile/* — kept in sync by hand with apps/web's route handlers.
// No Prisma types here on purpose: this package must stay importable from Expo (RN has no
// Node/Prisma runtime), so every shape here is a plain literal, not `import type { X } from "@studentos/db"`.

export type DocumentStatus = "DRAFT" | "QUEUED" | "GENERATING" | "NEEDS_INPUT" | "READY" | "FAILED";

export type DocumentType = "ASSIGNMENT" | "REPORT" | "PPT" | "PROJECT" | "VIVA" | "RESUME" | "INTERVIEW" | "LAB_REPORT" | "BRANCH_SOLVER" | "DRAWING_VIVA";

export type DocSummary = {
  id: string;
  title: string;
  status: DocumentStatus;
  feature?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** The Vault list returns every document type mixed together, so it needs `type` to route each row. */
export type VaultDocSummary = DocSummary & { type: DocumentType };

export type ClarifyQuestion = { id: string; question: string; type: "single" | "multi" | "text"; options: string[] };

export type ApiError = { error: string; upgrade?: boolean; needsOnboarding?: boolean };

// ---- /api/mobile/me ----
export type MeResponse = {
  id: string;
  email: string;
  onboarded: boolean;
  userType: "STUDENT" | "PROFESSIONAL";
  shell: {
    name: string;
    department: string | null;
    semester: string | null;
    plan: string;
    codingEnabled: boolean;
    hasJoinableRealInterview: boolean;
    userType: "STUDENT" | "PROFESSIONAL";
  };
  capabilities: { codingEnabled: boolean; branchFeatures: string[] };
};

// ---- /api/mobile/onboarding ----
export type OnboardingInput = {
  department: string;
  isCustomDepartment: boolean;
  college: string;
  semester: string;
  codingEnabled: boolean;
  github: string;
  linkedin: string;
  phone: string;
  gpa: number | null;
  careerGoal: string | null;
  idCardKey: string;
  acceptedLegal: boolean;
};

// ---- /api/mobile/uploads ----
export type UploadUrlResponse = { key: string; url: string; expiresInSeconds: number };

// ---- Generic "create a generation job" shape (reports/ppt/assignments/lab-reports/branch-solver) ----
export type CreateJobResponse = { docId: string };

export type GeneratingDocDetail = {
  id: string;
  title: string;
  status: DocumentStatus;
  content: unknown;
  stage: string | null;
  questions?: ClarifyQuestion[] | null;
  error: string | null;
  updatedAt?: string;
};

// ---- /api/mobile/reports ----
export type CreateReportInput = { title: string; reportType: string; guidelines?: string; templateKey?: string };

// ---- /api/mobile/ppt ----
export type CreatePptInput = { title: string; guidelines?: string; slideCount?: number; templateKey?: string };

// ---- /api/mobile/resume ----
export type CreateResumeInput = {
  targetRole?: string;
  rawNotes?: string;
  contact?: Partial<{ name: string; email: string; phone: string; location: string; linkedin: string; github: string; portfolio: string }>;
};
export type ResumeDetail = { id: string; title: string; status: DocumentStatus; resume: unknown; meta: unknown; error: string | null };

// ---- /api/mobile/assignments, /api/mobile/lab-reports ----
export type CreateAssignmentInput = { questionText?: string; instructions?: string; uploadKey?: string };
export type CreateLabReportInput = { readingsText?: string; instructions?: string; uploadKey?: string };
export type AskTurnInput = { message: string };

// ---- /api/mobile/projects ----
export type SuggestIdeasInput = { interests?: string; difficulty?: string };
export type ProjectIdea = { title: string; summary: string; skills?: string[]; hardwareNote?: string };
export type FinalizeProjectInput = { idea: ProjectIdea; description?: string };
export type ProjectDetail = { title: string; content: unknown };
export type BundleItem = { docId?: string; status: "ready" | "needs_input" | "failed" | "skipped"; error?: string };
export type ProjectBundle = { report?: BundleItem; ppt?: BundleItem; viva?: BundleItem };

// ---- /api/mobile/branch-solver ----
export type CreateBranchSolverInput = { feature: string; questionText?: string; instructions?: string; uploadKey?: string };

// ---- /api/mobile/vault ----
export type VaultDoc = VaultDocSummary;

// ---- /api/mobile/support ----
export type SupportTicketInput = { subject: string; message: string };

// ---- /api/mobile/feedback ----
export type FeedbackType = "BUG" | "FEATURE_REQUEST" | "IMPROVEMENT" | "OTHER";
export type FeedbackInput = { type: FeedbackType; message: string; page: string };

// ---- /api/mobile/settings/profile ----
export type ProfileEditInput = {
  name: string;
  careerGoal: string;
  github: string;
  linkedin: string;
  gpa: number | null;
  department?: string;
  semester?: string;
  college?: string;
  companyName?: string;
  jobTitle?: string;
  yearsOfExperience?: number | null;
};

// ---- /api/assistant (reused as-is, not under /api/mobile) ----
export type AssistantMessage = { role: "user" | "assistant"; content: string };
