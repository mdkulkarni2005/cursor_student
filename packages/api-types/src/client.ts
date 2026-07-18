import type {
  ApiError,
  AskTurnInput,
  CreateAssignmentInput,
  CreateBranchSolverInput,
  CreateJobResponse,
  CreateLabReportInput,
  CreatePptInput,
  CreateReportInput,
  CreateResumeInput,
  DocSummary,
  FinalizeProjectInput,
  GeneratingDocDetail,
  MeResponse,
  OnboardingInput,
  PptDeckContent,
  ProfileEditInput,
  ProjectBreakdownContent,
  ProjectBundle,
  ProjectDetail,
  ProjectIdea,
  Resume,
  ResumeDensity,
  ResumeDetail,
  SuggestIdeasInput,
  SupportTicketInput,
  FeedbackInput,
  UploadUrlResponse,
  VaultDocSummary,
  WorkspaceResponse,
  SearchResponse,
  MessagesResponse,
  ScheduleRespondInput,
  ProfileResponse,
  SetRecruiterVisibilityInput,
  PlansResponse,
  CheckoutOrderInput,
  CheckoutOrderResponse,
  CheckoutVerifyInput,
} from "./types";

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(body.error || `Request failed (${status})`);
    this.name = "ApiRequestError";
  }
}

/**
 * Thin fetch wrapper the Expo app uses to talk to apps/web's /api/mobile/* routes (and a few
 * existing /api/* routes reused as-is, like /api/assistant). Auth is a Clerk session token —
 * the caller supplies `getToken` (Clerk Expo's useAuth().getToken) so this package never
 * imports @clerk/clerk-expo itself and stays framework-agnostic.
 */
export class StudentOSClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: () => Promise<string | null>,
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.getToken();
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init?.headers,
        },
      });
    } catch {
      // Native platforms surface a raw socket exception here (e.g. Android's
      // java.net.ConnectException) naming the unreachable host — not actionable for a student.
      // Give them something they can actually do instead.
      throw new Error("Can't reach StudentOS. Check your connection and try again.");
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiRequestError(res.status, body as ApiError);
    return body as T;
  }

  private post<T>(path: string, input?: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body: input !== undefined ? JSON.stringify(input) : undefined });
  }
  private patch<T>(path: string, input?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body: input !== undefined ? JSON.stringify(input) : undefined });
  }
  private del<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  me(): Promise<MeResponse> {
    return this.request("/api/mobile/me");
  }
  completeOnboarding(input: OnboardingInput): Promise<{ ok: true }> {
    return this.post("/api/mobile/onboarding", input);
  }
  requestUploadUrl(ext: string): Promise<UploadUrlResponse> {
    return this.post("/api/mobile/uploads", { ext });
  }

  // Reports
  listReports(): Promise<{ reports: DocSummary[] }> {
    return this.request("/api/mobile/reports");
  }
  createReport(input: CreateReportInput): Promise<CreateJobResponse> {
    return this.post("/api/mobile/reports", input);
  }
  getReport(id: string): Promise<GeneratingDocDetail> {
    return this.request(`/api/mobile/reports/${id}`);
  }
  resumeReport(id: string, answers: Record<string, string>): Promise<{ ok: true }> {
    return this.post(`/api/mobile/reports/${id}/resume`, { answers });
  }
  reportDownloadUrl(id: string): Promise<{ url: string; expiresInSeconds: number }> {
    return this.request(`/api/mobile/reports/${id}/download`);
  }

  // PPT
  listPpts(): Promise<{ decks: DocSummary[] }> {
    return this.request("/api/mobile/ppt");
  }
  createPpt(input: CreatePptInput): Promise<CreateJobResponse> {
    return this.post("/api/mobile/ppt", input);
  }
  getPpt(id: string): Promise<GeneratingDocDetail> {
    return this.request(`/api/mobile/ppt/${id}`);
  }
  resumePpt(id: string, answers: Record<string, string>): Promise<{ ok: true }> {
    return this.post(`/api/mobile/ppt/${id}/resume`, { answers });
  }
  savePpt(id: string, content: PptDeckContent): Promise<{ ok: true }> {
    return this.patch(`/api/mobile/ppt/${id}`, content);
  }
  pptDownloadUrl(id: string): Promise<{ url: string; expiresInSeconds: number }> {
    return this.request(`/api/mobile/ppt/${id}/download`);
  }
  pptImageUrl(id: string, slideIndex: number): Promise<{ url: string; expiresInSeconds: number }> {
    return this.request(`/api/mobile/ppt/${id}/image/${slideIndex}`);
  }

  // Resume
  listResumes(): Promise<{ resumes: DocSummary[] }> {
    return this.request("/api/mobile/resume");
  }
  createResume(input: CreateResumeInput): Promise<CreateJobResponse> {
    return this.post("/api/mobile/resume", input);
  }
  getResume(id: string): Promise<ResumeDetail> {
    return this.request(`/api/mobile/resume/${id}`);
  }
  updateResume(id: string, resume: Resume): Promise<{ ok: true }> {
    return this.patch(`/api/mobile/resume/${id}`, { resume });
  }
  setResumeDensity(id: string, density: ResumeDensity): Promise<{ ok: true }> {
    return this.post(`/api/mobile/resume/${id}/density`, { density });
  }
  resumeDownloadUrl(id: string): Promise<{ url: string; expiresInSeconds: number }> {
    return this.request(`/api/mobile/resume/${id}/download`);
  }

  // Assignments
  listAssignments(): Promise<{ assignments: DocSummary[] }> {
    return this.request("/api/mobile/assignments");
  }
  createAssignment(input: CreateAssignmentInput): Promise<CreateJobResponse> {
    return this.post("/api/mobile/assignments", input);
  }
  getAssignment(id: string): Promise<GeneratingDocDetail> {
    return this.request(`/api/mobile/assignments/${id}`);
  }
  askAssignment(id: string, input: AskTurnInput): Promise<{ ok: true }> {
    return this.post(`/api/mobile/assignments/${id}/ask`, input);
  }

  // Lab reports
  listLabReports(): Promise<{ labReports: DocSummary[] }> {
    return this.request("/api/mobile/lab-reports");
  }
  createLabReport(input: CreateLabReportInput): Promise<CreateJobResponse> {
    return this.post("/api/mobile/lab-reports", input);
  }
  getLabReport(id: string): Promise<GeneratingDocDetail> {
    return this.request(`/api/mobile/lab-reports/${id}`);
  }
  labReportDownloadUrl(id: string): Promise<{ url: string; expiresInSeconds: number }> {
    return this.request(`/api/mobile/lab-reports/${id}/download`);
  }
  askLabReport(id: string, input: AskTurnInput): Promise<{ ok: true }> {
    return this.post(`/api/mobile/lab-reports/${id}/ask`, input);
  }

  // Projects
  suggestProjectIdeas(input: SuggestIdeasInput): Promise<{ ideas: ProjectIdea[] }> {
    return this.post("/api/mobile/projects/ideas", input);
  }
  listProjects(): Promise<{ projects: DocSummary[] }> {
    return this.request("/api/mobile/projects");
  }
  finalizeProject(input: FinalizeProjectInput): Promise<CreateJobResponse> {
    return this.post("/api/mobile/projects", input);
  }
  getProject(id: string): Promise<ProjectDetail> {
    return this.request(`/api/mobile/projects/${id}`);
  }
  generateProjectBundle(id: string): Promise<{ bundle: ProjectBundle }> {
    return this.post(`/api/mobile/projects/${id}/bundle`);
  }
  generateProjectPlan(id: string): Promise<{ plan: ProjectBreakdownContent }> {
    return this.post(`/api/mobile/projects/${id}/plan`);
  }

  // Branch-specific tools
  listBranchSolverDocs(feature?: string): Promise<{ documents: DocSummary[] }> {
    return this.request(`/api/mobile/branch-solver${feature ? `?feature=${encodeURIComponent(feature)}` : ""}`);
  }
  createBranchSolverDoc(input: CreateBranchSolverInput): Promise<CreateJobResponse> {
    return this.post("/api/mobile/branch-solver", input);
  }
  getBranchSolverDoc(id: string): Promise<GeneratingDocDetail & { feature: string | null }> {
    return this.request(`/api/mobile/branch-solver/${id}`);
  }

  // Vault
  listVault(type?: string): Promise<{ documents: VaultDocSummary[] }> {
    return this.request(`/api/mobile/vault${type ? `?type=${encodeURIComponent(type)}` : ""}`);
  }
  deleteVaultDoc(id: string): Promise<{ ok: true }> {
    return this.del(`/api/mobile/vault/${id}`);
  }

  // Settings / support
  updateProfile(input: ProfileEditInput): Promise<{ ok: true }> {
    return this.patch("/api/mobile/settings/profile", input);
  }
  createSupportTicket(input: SupportTicketInput): Promise<{ ok: true }> {
    return this.post("/api/mobile/support", input);
  }
  sendFeedback(input: FeedbackInput): Promise<{ ok: true }> {
    return this.post("/api/mobile/feedback", input);
  }

  // Assistant (existing /api/assistant route, reused as-is — see plan)
  getAssistantThread(): Promise<{ messages: { role: string; content: string }[] }> {
    return this.request("/api/assistant");
  }

  // Workspace (this-semester grouped view — distinct from Vault's all-time archive)
  getWorkspace(): Promise<WorkspaceResponse> {
    return this.request("/api/mobile/workspace");
  }

  // Search (title search over the signed-in student's own documents)
  search(query: string): Promise<SearchResponse> {
    return this.request(`/api/mobile/search?q=${encodeURIComponent(query)}`);
  }

  // Messages (recruiter inbox + interview requests)
  listMessages(): Promise<MessagesResponse> {
    return this.request("/api/mobile/messages");
  }
  markMessageRead(id: string): Promise<{ ok: true }> {
    return this.post(`/api/mobile/messages/${id}/read`);
  }
  respondToSchedule(id: string, input: ScheduleRespondInput): Promise<{ ok: true }> {
    return this.post(`/api/mobile/messages/schedule/${id}/respond`, input);
  }

  // Profile
  getProfile(): Promise<ProfileResponse> {
    return this.request("/api/mobile/profile");
  }
  setRecruiterVisibility(input: SetRecruiterVisibilityInput): Promise<{ ok: true }> {
    return this.patch("/api/mobile/profile", input);
  }
  ensureShareHandle(): Promise<{ handle: string }> {
    return this.post("/api/mobile/profile/share");
  }

  // Plans & payments
  getPlans(): Promise<PlansResponse> {
    return this.request("/api/mobile/plans");
  }
  createCheckoutOrder(input: CheckoutOrderInput): Promise<CheckoutOrderResponse> {
    return this.post("/api/mobile/checkout/order", input);
  }
  verifyCheckout(input: CheckoutVerifyInput): Promise<{ ok: true }> {
    return this.post("/api/mobile/checkout/verify", input);
  }
}
