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
  /** Full editable-field values for the Settings screen — not needed for routing, so kept apart from `shell`. */
  profile: {
    careerGoal: string | null;
    github: string | null;
    linkedin: string | null;
    gpa: number | null;
    college: string | null;
    companyName: string | null;
    jobTitle: string | null;
    yearsOfExperience: number | null;
  };
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

/**
 * Mirrors `packages/documents/src/ppt.ts` `PptSlide`/`PptTheme`/etc — redefined here (not
 * imported) because this package must stay importable from Expo with no Node-only deps
 * (see the file-top note); @studentos/documents pulls in pptxgenjs.
 */
export type PptRun = { text: string; b?: boolean; i?: boolean; u?: boolean; color?: string; face?: string; size?: number };
export type PptRichText = string | PptRun[];
export type PptLayout = "bullets" | "two-column" | "image" | "table" | "diagram" | "stat" | "quote" | "section";
export type PptTable = { headers: string[]; rows: string[][] };
export type PptDiagram = { kind: "process" | "cycle" | "hierarchy"; nodes: string[] };
export type PptStat = { value: string; label: string };
export type PptColumns = { leftTitle?: string; rightTitle?: string; left: PptRichText[]; right: PptRichText[] };
export type PptQuote = { text: PptRichText; attribution?: string };
export type PptSlide = {
  layout: PptLayout;
  heading: PptRichText;
  bullets: PptRichText[];
  columns?: PptColumns;
  table?: PptTable;
  diagram?: PptDiagram;
  stats?: PptStat[];
  quote?: PptQuote;
  notes?: string;
  /** R2 object key, not a URL — fetch via `pptImageUrl(docId, slideIndex)`. */
  image?: string;
  imageScale?: number;
};
export type PptTheme = { dark: string; light: string; accent: string; headColor: string; headFont: string; bodyFont: string };
export type PptDeckContent = { title: string; subtitle: string; slides: PptSlide[]; theme?: PptTheme; templated?: boolean };

// ---- /api/mobile/resume ----
export type CreateResumeInput = {
  targetRole?: string;
  rawNotes?: string;
  contact?: Partial<{ name: string; email: string; phone: string; location: string; linkedin: string; github: string; portfolio: string }>;
};

/**
 * Mirrors `packages/documents/src/resume.ts` — redefined here (not imported) because this
 * package must stay importable from Expo with no Node-only deps (see the file-top note);
 * @studentos/documents pulls in docx/pdfkit.
 */
export type ResumeDateRange = { start?: string; end?: string };
export type ResumeContact = { name: string; phone?: string; email?: string; location?: string; linkedin?: string; github?: string; portfolio?: string };
export type ResumeSkillGroup = { category: string; items: string[] };
export type ResumeExperience = { organization: string; role?: string; location?: string; dates?: ResumeDateRange; bullets: string[] };
export type ResumeProject = { name: string; role?: string; location?: string; dates?: ResumeDateRange; bullets: string[]; link?: string };
export type ResumeEducation = { institution: string; degree?: string; location?: string; dates?: ResumeDateRange };
export type Resume = {
  contact: ResumeContact;
  summary?: string;
  skills: ResumeSkillGroup[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  education: ResumeEducation[];
};
export type ResumeDensity = "normal" | "tight";

export type AtsCheck = { label: string; ok: boolean; weight: number; detail?: string };
export type AtsReport = { score: number; keywordCoverage: number; matched: string[]; missing: string[]; checks: AtsCheck[]; suggestions: string[] };
export type ResumeMeta = { density: ResumeDensity; targetRole?: string; jobDescription?: string; ats?: AtsReport };

export type ResumeDetail = { id: string; title: string; status: DocumentStatus; resume: Resume | null; meta: ResumeMeta | null; error: string | null };

// ---- /api/mobile/assignments, /api/mobile/lab-reports ----
export type CreateAssignmentInput = { questionText?: string; instructions?: string; uploadKey?: string };
export type CreateLabReportInput = { readingsText?: string; instructions?: string; uploadKey?: string };
export type AskTurnInput = { message: string };

// ---- /api/mobile/projects ----
export type SuggestIdeasInput = { interests?: string; difficulty?: string };
export type ProjectDifficulty = "mini" | "major" | "tpcs" | "3rd-year";
/** Mirrors `packages/ai/src/project.ts` `ProjectIdeaSchema` — redefined here, not imported (same
 *  no-Node-deps reasoning as the other mirrored types in this file). */
export type ProjectIdea = {
  title: string;
  summary: string;
  difficulty: ProjectDifficulty;
  skills: string[];
  hardwareNeeded: boolean;
  hardwareNote?: string;
  whyGood: string;
};
export type FinalizeProjectInput = { idea: ProjectIdea; description?: string };

export type ProjectDiagram = { label: string; mermaid: string };
export type ProjectPhase = { name: string; description: string; tasks: string[] };
export type ProjectComponent = { name: string; purpose: string; tech: string };
export type ProjectResearch = { topic: string; why: string; searchQuery: string };
export type ProjectImage = { label: string; key: string };
export type ProjectBreakdownContent = {
  problemStatement: string;
  solution: string;
  diagrams: ProjectDiagram[];
  phases: ProjectPhase[];
  components: ProjectComponent[];
  research: ProjectResearch[];
  differentiators: string[];
  images: ProjectImage[];
};

export type BundleItem = { docId?: string; status: "ready" | "needs_input" | "failed" | "skipped"; error?: string };
export type ProjectBundle = { report?: BundleItem; ppt?: BundleItem; viva?: BundleItem };
export type ProjectContent = { idea: ProjectIdea; description?: string; bundle?: ProjectBundle; breakdown?: ProjectBreakdownContent };
export type ProjectDetail = { title: string; content: ProjectContent };

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

// ---- /api/mobile/workspace ----
export type WorkspaceGroup = { type: DocumentType; label: string; documents: DocSummary[] };
export type WorkspaceResponse = { name: string; department: string | null; totalCount: number; groups: WorkspaceGroup[] };

// ---- /api/mobile/search ----
export type SearchResponse = { documents: VaultDocSummary[] };

// ---- /api/mobile/messages ----
export type ScheduleStatus = "PROPOSED" | "ACCEPTED" | "DECLINED" | "RESCHEDULE_REQUESTED" | "CANCELED" | "COMPLETED" | "RESCHEDULE_DECLINED";
export type InterviewRequestSummary = {
  id: string;
  status: ScheduleStatus;
  proposedAt: string;
  note: string | null;
  meetingLink: string | null;
  recruiter: { name: string | null; companyName: string | null };
};
export type RecruiterMessageSummary = {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  recruiter: { name: string | null; companyName: string | null };
};
export type MessagesResponse = { interviews: InterviewRequestSummary[]; messages: RecruiterMessageSummary[] };
export type ScheduleRespondInput = { action: "accept" | "decline" | "reschedule"; studentNote?: string };

// ---- /api/mobile/profile ----
export type ProfileResponse = {
  name: string;
  initials: string;
  headline: string;
  department: string | null;
  semester: string | null;
  institution: string | null;
  skills: string[];
  links: { github?: string; linkedin?: string; portfolio?: string };
  projects: { id: string; name: string; summary: string }[];
  gpa: number | null;
  resume: { id: string } | null;
  publicHandle: string | null;
  recruiterVisible: boolean;
};
export type SetRecruiterVisibilityInput = { visible: boolean };

// ---- /api/mobile/plans ----
export type PlanLimitsShape = { usage: Record<string, number | null>; features: Record<string, boolean> };
export type PlanTierSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  billingPeriod: string;
  isFree: boolean;
  limits: PlanLimitsShape;
  /** This tier's monthly credit balance (1 credit ≈ ₹1 of real AI cost), null = unlimited. Every
   *  generation AND every edit/regeneration/follow-up spends from it — see CreditStatusShape. */
  credits: number | null;
};
export type PlanUsageRow = { kind: string; label: string; used: number; limit: number | null; remaining: number | null };
export type CreditStatusShape = { limit: number | null; used: number; remaining: number | null };
export type PlansResponse = {
  tiers: PlanTierSummary[];
  currentTierId: string | null;
  paymentsEnabled: boolean;
  usage: PlanUsageRow[];
  credits: CreditStatusShape;
};

// ---- /api/mobile/checkout ----
export type CheckoutOrderInput = { planTierId: string };
export type CheckoutOrderResponse =
  | { mode: "order"; keyId: string; orderId: string; amountCents: number; currency: string; tierName: string; planTierId: string }
  | { mode: "subscription"; keyId: string; subscriptionId: string; tierName: string; currency: string; planTierId: string };
export type CheckoutVerifyInput =
  | { mode: "order"; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; planTierId: string }
  | { mode: "subscription"; razorpay_subscription_id: string; razorpay_payment_id: string; razorpay_signature: string; planTierId: string };
