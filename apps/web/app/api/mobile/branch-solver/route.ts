import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";
import { createBranchSolverDoc, runBranchSolverGeneration } from "@/lib/branch-solver/generate";
import { hasBranchFeature } from "@/lib/capabilities";
import { branchSolverFeature } from "@/lib/branch-solver/features";
import { QuotaExceededError } from "@/lib/entitlements";
import { rateLimit, friendlyError } from "@/lib/reliability";

const MIME_BY_EXT: Record<string, string> = { docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };

/** One generic route for every department's branch tool (mech-solver, structural-checker, ee-solver, …). */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!user.onboardedAt) return NextResponse.json({ error: "Complete onboarding first.", needsOnboarding: true }, { status: 409 });

  let body: { feature?: string; questionText?: string; instructions?: string; uploadKey?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const feature = String(body.feature ?? "");
  if (!feature || !branchSolverFeature(feature) || !hasBranchFeature(user.department, feature)) {
    return NextResponse.json({ error: "This tool isn't available for your branch." }, { status: 403 });
  }

  try {
    await rateLimit(user.id, `branch-solver:${feature}`);
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 429 });
  }

  const questionText = body.questionText?.trim() || undefined;
  const instructions = body.instructions?.trim() || undefined;
  const uploadKey = body.uploadKey || undefined;
  if (!questionText && !uploadKey) return NextResponse.json({ error: "Type the question or upload a photo/PDF of it." }, { status: 400 });

  const ext = uploadKey?.split(".").pop() ?? "";
  const uploadMime = uploadKey ? MIME_BY_EXT[ext] : undefined;
  const title = questionText ? questionText.slice(0, 60) : branchSolverFeature(feature)!.label;
  const input = { userId: user.id, feature, title, questionText, instructions, uploadKey, uploadMime };

  let docId: string;
  try {
    docId = await createBranchSolverDoc(input);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: `You've used all ${err.limit} free branch-tool generations this month. Upgrade to Pro for unlimited.`, upgrade: true },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: friendlyError(err) }, { status: 400 });
  }

  after(() => runBranchSolverGeneration(docId, input));
  return NextResponse.json({ docId }, { status: 201 });
}

export async function GET(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const feature = new URL(req.url).searchParams.get("feature") || undefined;
  const docs = await prisma.document.findMany({
    where: { ownerId: user.id, type: "BRANCH_SOLVER", ...(feature ? { feature } : {}) },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, status: true, feature: true, createdAt: true, updatedAt: true },
    take: 100,
  });
  return NextResponse.json({ documents: docs });
}
