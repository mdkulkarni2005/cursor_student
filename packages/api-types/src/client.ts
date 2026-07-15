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
  ProfileEditInput,
  ProjectBundle,
  ProjectDetail,
  ProjectIdea,
  ResumeDetail,
  SuggestIdeasInput,
  SupportTicketInput,
  FeedbackInput,
  UploadUrlResponse,
  VaultDocSummary,
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
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
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
  pptDownloadUrl(id: string): Promise<{ url: string; expiresInSeconds: number }> {
    return this.request(`/api/mobile/ppt/${id}/download`);
  }

  // Resume
  createResume(input: CreateResumeInput): Promise<CreateJobResponse> {
    return this.post("/api/mobile/resume", input);
  }
  getResume(id: string): Promise<ResumeDetail> {
    return this.request(`/api/mobile/resume/${id}`);
  }
  updateResume(id: string, resume: unknown): Promise<{ ok: true }> {
    return this.patch(`/api/mobile/resume/${id}`, { resume });
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
  generateProjectPlan(id: string): Promise<{ plan: unknown }> {
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
}
