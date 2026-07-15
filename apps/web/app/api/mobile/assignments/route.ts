import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";
import { createAssignmentDoc, runAssignmentGeneration } from "@/lib/assignments/generate";
import { QuotaExceededError } from "@/lib/entitlements";
import { rateLimit, friendlyError } from "@/lib/reliability";

const MIME_BY_EXT: Record<string, string> = { docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };

/** Mobile's camera is arguably the better fit for this feature — upload via POST /api/mobile/uploads first. */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!user.onboardedAt) return NextResponse.json({ error: "Complete onboarding first.", needsOnboarding: true }, { status: 409 });

  try {
    await rateLimit(user.id, "assignment");
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 429 });
  }

  let body: { questionText?: string; instructions?: string; uploadKey?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const questionText = body.questionText?.trim() || undefined;
  const instructions = body.instructions?.trim() || undefined;
  const uploadKey = body.uploadKey || undefined;
  if (!questionText && !uploadKey) return NextResponse.json({ error: "Type the question or upload a photo/PDF of it." }, { status: 400 });

  const ext = uploadKey?.split(".").pop() ?? "";
  const uploadMime = uploadKey ? MIME_BY_EXT[ext] : undefined;
  const title = questionText ? questionText.slice(0, 60) : "Photo assignment";
  const input = { userId: user.id, title, questionText, instructions, uploadKey, uploadMime };

  let docId: string;
  try {
    docId = await createAssignmentDoc(input);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: `You've used all ${err.limit} free assignments this month. Upgrade to Pro for unlimited.`, upgrade: true },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: friendlyError(err) }, { status: 400 });
  }

  after(() => runAssignmentGeneration(docId, input));
  return NextResponse.json({ docId }, { status: 201 });
}

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const docs = await prisma.document.findMany({
    where: { ownerId: user.id, type: "ASSIGNMENT" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, status: true, createdAt: true, updatedAt: true },
    take: 100,
  });
  return NextResponse.json({ assignments: docs });
}
