import { prisma } from "@studentos/db";
import { reviewSystemDesign, type SystemDesignReview } from "@studentos/ai";
import { SYSTEM_DESIGN_BY_SLUG } from "@/lib/system-design/catalog";

/** What we persist — includes canvas layout (position) so a reopened design restores exactly. */
export type PersistedCanvasNode = { id: string; kind: string; label: string; position: { x: number; y: number } };
export type PersistedCanvasEdge = { id: string; source: string; target: string };
export type SystemDesignCanvas = { nodes: PersistedCanvasNode[]; edges: PersistedCanvasEdge[] };

export type GradeDesignInput = {
  userId: string;
  slug: string;
  canvas: SystemDesignCanvas;
};

/**
 * Review a submitted architecture with AI and persist the attempt (append-only). There's no
 * pass/fail here — every submission gets a review, since there's no single "correct" design.
 */
export async function gradeDesign(input: GradeDesignInput): Promise<{ attemptId: string; review: SystemDesignReview }> {
  const scenario = SYSTEM_DESIGN_BY_SLUG[input.slug];
  if (!scenario) throw new Error("Unknown scenario.");
  if (input.canvas.nodes.length === 0) throw new Error("Add at least one component to the canvas before submitting.");

  const { review } = await reviewSystemDesign({
    scenarioTitle: scenario.title,
    scenarioPrompt: scenario.prompt,
    nodes: input.canvas.nodes.map((n) => ({ id: n.id, type: n.kind, label: n.label })),
    edges: input.canvas.edges.map((e) => ({ source: e.source, target: e.target })),
  });

  const attempt = await prisma.systemDesignAttempt.create({
    data: {
      userId: input.userId,
      scenarioSlug: input.slug,
      canvas: input.canvas as unknown as object,
      review: review as unknown as object,
    },
  });
  await prisma.systemDesignDraft.deleteMany({ where: { userId: input.userId, scenarioSlug: input.slug } });
  return { attemptId: attempt.id, review };
}

/** The latest attempt for a specific scenario (to reopen the canvas + show the last review). */
export async function getLatestDesignAttempt(userId: string, slug: string) {
  return prisma.systemDesignAttempt.findFirst({
    where: { userId, scenarioSlug: slug },
    orderBy: { createdAt: "desc" },
  });
}

/** Autosave the in-progress canvas (upsert — overwrites, no history, no AI cost). */
export async function saveDesignDraft(userId: string, slug: string, canvas: SystemDesignCanvas): Promise<void> {
  if (!SYSTEM_DESIGN_BY_SLUG[slug]) throw new Error("Unknown scenario.");
  await prisma.systemDesignDraft.upsert({
    where: { userId_scenarioSlug: { userId, scenarioSlug: slug } },
    create: { userId, scenarioSlug: slug, canvas: canvas as unknown as object },
    update: { canvas: canvas as unknown as object },
  });
}

/**
 * The canvas to open a scenario with: prefer the draft if it's newer than the last graded
 * attempt (the student kept editing after submitting), otherwise fall back to the attempt, else
 * nothing (blank canvas).
 */
export async function getOpeningCanvas(
  userId: string,
  slug: string,
): Promise<{ canvas: SystemDesignCanvas; review: SystemDesignReview | null } | null> {
  const [attempt, draft] = await Promise.all([
    prisma.systemDesignAttempt.findFirst({ where: { userId, scenarioSlug: slug }, orderBy: { createdAt: "desc" } }),
    prisma.systemDesignDraft.findUnique({ where: { userId_scenarioSlug: { userId, scenarioSlug: slug } } }),
  ]);

  if (draft && (!attempt || draft.updatedAt > attempt.createdAt)) {
    return { canvas: draft.canvas as unknown as SystemDesignCanvas, review: attempt ? (attempt.review as unknown as SystemDesignReview) : null };
  }
  if (attempt) {
    return { canvas: attempt.canvas as unknown as SystemDesignCanvas, review: attempt.review as unknown as SystemDesignReview | null };
  }
  return null;
}

export type SystemDesignProgress = { attemptedSlugs: string[]; totalAttempts: number };

export async function getSystemDesignProgress(userId: string): Promise<SystemDesignProgress> {
  const attempts = await prisma.systemDesignAttempt.findMany({
    where: { userId },
    select: { scenarioSlug: true },
  });
  return {
    attemptedSlugs: [...new Set(attempts.map((a) => a.scenarioSlug))],
    totalAttempts: attempts.length,
  };
}
