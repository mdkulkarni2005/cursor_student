import { prisma, type User } from "@studentos/db";
import type { ProjectIdea, ProjectBreakdown } from "@studentos/ai";
import { generateProjectBreakdown, generateProjectIdeas, generateSlideImage, ProjectIdeaSchema } from "@studentos/ai";
import { putObject, keys } from "@studentos/storage";
import { getOrCreateCurrentWorkspace } from "@/lib/workspace";
import { generateAndStoreReport } from "@/lib/reports/generate";
import { generateAndStorePpt } from "@/lib/ppt/generate";
import { generateAndStoreViva } from "@/lib/viva/generate";
import { QuotaExceededError } from "@/lib/entitlements";

/** A finalized project's stored content (the chosen idea + the generated-bundle pointers). */
export type BundleItem = { docId?: string; status: "ready" | "needs_input" | "failed" | "skipped"; error?: string };
export type ProjectBundle = { report?: BundleItem; ppt?: BundleItem; viva?: BundleItem };
/** A generated illustrative (non-diagram) image — PNG bytes live in storage, the key here. */
export type ProjectImage = { label: string; key: string };
/** The persisted build plan: the AI breakdown, minus the raw image prompts, plus the generated image keys. */
export type ProjectBreakdownContent = {
  problemStatement: string;
  solution: string;
  diagrams: ProjectBreakdown["diagrams"];
  phases: ProjectBreakdown["phases"];
  components: ProjectBreakdown["components"];
  research: ProjectBreakdown["research"];
  differentiators: string[];
  images: ProjectImage[];
};
export type ProjectContent = {
  idea: ProjectIdea;
  description?: string;
  bundle?: ProjectBundle;
  /** The full build-out: problem/solution, diagrams, images, phased plan, components, research, differentiators. */
  breakdown?: ProjectBreakdownContent;
};

/** Persist the FINALIZED idea as a PROJECT document (candidates before this are throwaway). */
export async function finalizeProject(
  userId: string,
  idea: ProjectIdea,
  description?: string,
): Promise<{ docId: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");
  const workspace = await getOrCreateCurrentWorkspace(user);

  const content: ProjectContent = { idea, description };
  const doc = await prisma.document.create({
    data: {
      ownerId: user.id,
      type: "PROJECT",
      title: idea.title,
      status: "READY",
      workspaceId: workspace.id,
      content: { create: { data: content as unknown as object } },
    },
  });
  return { docId: doc.id };
}

/**
 * Ideas suggested for the Projects landing page WITHOUT the student asking first — generated
 * from their onboarding profile (department + career goal) and cached on the User row so a
 * repeat visit doesn't re-call the model. Generates lazily on first read; `force` re-generates.
 */
export async function getOrGeneratePregeneratedIdeas(user: User, force = false): Promise<ProjectIdea[]> {
  if (!force && user.pregeneratedIdeas) {
    const parsed = ProjectIdeaSchema.array().safeParse(user.pregeneratedIdeas);
    if (parsed.success && parsed.data.length > 0) return parsed.data;
  }
  const { content } = await generateProjectIdeas({
    department: user.department ?? "Engineering",
    interests: user.careerGoal ?? undefined,
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { pregeneratedIdeas: content.ideas as unknown as object, pregeneratedIdeasAt: new Date() },
  });
  return content.ideas;
}

export async function getProject(userId: string, docId: string): Promise<{ title: string; content: ProjectContent } | null> {
  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: userId, type: "PROJECT" },
    include: { content: true },
  });
  if (!doc?.content) return null;
  return { title: doc.title, content: doc.content.data as unknown as ProjectContent };
}

/**
 * Generate the full build plan (diagrams, phased plan, components, research, differentiators)
 * for a finalized project and persist it onto the project's content. On-demand, not automatic —
 * a student triggers this once they've committed to an idea.
 */
export async function generateProjectPlan(userId: string, docId: string): Promise<ProjectBreakdownContent> {
  const [project, user] = await Promise.all([
    getProject(userId, docId),
    prisma.user.findUnique({ where: { id: userId }, select: { department: true } }),
  ]);
  if (!project) throw new Error("Project not found.");
  const guidelines = projectGuidelines(project.content);
  const { content: breakdown } = await generateProjectBreakdown({
    idea: project.content.idea,
    department: user?.department ?? "Engineering",
    guidelines,
  });

  // Normal (non-diagram) illustrative images — best-effort, same as PPT slide art: on stub or any
  // failure we just skip that image rather than fail the whole build plan.
  const images = (
    await Promise.all(
      breakdown.imageBriefs.map(async (brief, idx): Promise<ProjectImage | null> => {
        const img = await generateSlideImage(brief.prompt, "1024x1024");
        if (!img) return null;
        const m = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i.exec(img.dataUrl);
        if (!m) return null;
        const key = keys.projectImage(docId, idx);
        await putObject(key, Buffer.from(m[2]!, "base64"), m[1]!);
        return { label: brief.label, key };
      }),
    )
  ).filter((x): x is ProjectImage => !!x);

  const breakdownContent: ProjectBreakdownContent = {
    problemStatement: breakdown.problemStatement,
    solution: breakdown.solution,
    diagrams: breakdown.diagrams,
    phases: breakdown.phases,
    components: breakdown.components,
    research: breakdown.research,
    differentiators: breakdown.differentiators,
    images,
  };
  const newContent: ProjectContent = { ...project.content, breakdown: breakdownContent };
  await prisma.documentContent.update({
    where: { documentId: docId },
    data: { data: newContent as unknown as object },
  });
  return breakdownContent;
}

/** Rich context handed to each generator so they don't pause for input (NEEDS_INPUT defense). */
function projectGuidelines(c: ProjectContent): string {
  const { idea } = c;
  return [
    `Project: ${idea.title}.`,
    idea.summary,
    `Key skills/tech: ${idea.skills.join(", ")}.`,
    idea.hardwareNeeded ? `Hardware: ${idea.hardwareNote ?? "a physical model is involved"}.` : "Software-only project.",
    c.description ? `Additional details: ${c.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Generate the academic bundle from a finalized project: report + PPT + viva (+ the report's
 * plagiarism/AI quality scores come for free). Per-item & resilient — partial success is valid.
 * Viva is built from the report only if the report came back READY; otherwise off the project.
 */
export async function generateProjectBundle(userId: string, docId: string): Promise<ProjectBundle> {
  const project = await getProject(userId, docId);
  if (!project) throw new Error("Project not found.");
  const guidelines = projectGuidelines(project.content);
  const title = project.content.idea.title;
  const bundle: ProjectBundle = { ...project.content.bundle };

  // Report
  try {
    const res = await generateAndStoreReport({ userId, title, reportType: "project", guidelines });
    bundle.report = { docId: res.docId, status: res.status };
  } catch (err) {
    bundle.report = { status: "failed", error: errMsg(err) };
  }

  // PPT
  try {
    const res = await generateAndStorePpt({ userId, title, slideCount: 10, guidelines });
    bundle.ppt = { docId: res.docId, status: res.status };
  } catch (err) {
    bundle.ppt = { status: "failed", error: errMsg(err) };
  }

  // Viva — from the report if it's ready, else generate a standalone set off the PPT if ready.
  try {
    const vivaSource =
      bundle.report?.status === "ready" && bundle.report.docId
        ? bundle.report.docId
        : bundle.ppt?.status === "ready" && bundle.ppt.docId
          ? bundle.ppt.docId
          : null;
    if (vivaSource) {
      await generateAndStoreViva(userId, vivaSource);
      bundle.viva = { docId: vivaSource, status: "ready" };
    } else {
      bundle.viva = { status: "skipped", error: "No completed report/PPT to build viva from yet." };
    }
  } catch (err) {
    bundle.viva = { status: "failed", error: errMsg(err) };
  }

  // Persist the bundle pointers back onto the project.
  const newContent: ProjectContent = { ...project.content, bundle };
  await prisma.documentContent.update({
    where: { documentId: docId },
    data: { data: newContent as unknown as object },
  });
  return bundle;
}

function errMsg(err: unknown): string {
  if (err instanceof QuotaExceededError) return `Monthly ${err.kind.toLowerCase()} limit reached (${err.limit}). Upgrade for unlimited.`;
  return err instanceof Error ? err.message : String(err);
}
