import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";
import { createLabReportDoc, runLabReportGeneration } from "@/lib/lab-reports/generate";
import { QuotaExceededError } from "@/lib/entitlements";
import { rateLimit, friendlyError } from "@/lib/reliability";

const MIME_BY_EXT: Record<string, string> = { docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!user.onboardedAt) return NextResponse.json({ error: "Complete onboarding first.", needsOnboarding: true }, { status: 409 });

  try {
    await rateLimit(user.id, "lab-report");
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 429 });
  }

  let body: { readingsText?: string; instructions?: string; uploadKey?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const readingsText = body.readingsText?.trim() || undefined;
  const instructions = body.instructions?.trim() || undefined;
  const uploadKey = body.uploadKey || undefined;
  if (!readingsText && !uploadKey) return NextResponse.json({ error: "Type your raw readings or upload a photo of your observation table/graph." }, { status: 400 });

  const ext = uploadKey?.split(".").pop() ?? "";
  const uploadMime = uploadKey ? MIME_BY_EXT[ext] : undefined;
  const title = readingsText ? readingsText.slice(0, 60) : "Lab report";
  const input = { userId: user.id, title, readingsText, instructions, uploadKey, uploadMime };

  let docId: string;
  try {
    docId = await createLabReportDoc(input);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: `You've used all ${err.limit} free lab reports this month. Upgrade to Pro for unlimited.`, upgrade: true },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: friendlyError(err) }, { status: 400 });
  }

  after(() => runLabReportGeneration(docId, input));
  return NextResponse.json({ docId }, { status: 201 });
}

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const docs = await prisma.document.findMany({
    where: { ownerId: user.id, type: "LAB_REPORT" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, status: true, createdAt: true, updatedAt: true },
    take: 100,
  });
  return NextResponse.json({ labReports: docs });
}
