import { prisma } from "@studentos/db";
import type { ProjectIdea } from "@studentos/ai";
import { getOrCreateCurrentWorkspace } from "@/lib/workspace";
import { generateAndStoreReport } from "@/lib/reports/generate";
import { generateAndStorePpt } from "@/lib/ppt/generate";
import { generateAndStoreViva } from "@/lib/viva/generate";
import { QuotaExceededError } from "@/lib/entitlements";

/** A finalized project's stored content (the chosen idea + the generated-bundle pointers). */
export type BundleItem = { docId?: string; status: "ready" | "needs_input" | "failed" | "skipped"; error?: string };
export type ProjectBundle = { report?: BundleItem; ppt?: BundleItem; viva?: BundleItem };
export type ProjectContent = {
  idea: ProjectIdea;
  description?: string;
  bundle?: ProjectBundle;
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

export async function getProject(userId: string, docId: string): Promise<{ title: string; content: ProjectContent } | null> {
  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: userId, type: "PROJECT" },
    include: { content: true },
  });
  if (!doc?.content) return null;
  return { title: doc.title, content: doc.content.data as unknown as ProjectContent };
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
