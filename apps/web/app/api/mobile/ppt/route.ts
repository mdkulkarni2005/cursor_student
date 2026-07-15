import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";
import { createPptDoc, runPptGeneration } from "@/lib/ppt/generate";
import { QuotaExceededError } from "@/lib/entitlements";
import { rateLimit, friendlyError } from "@/lib/reliability";

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!user.onboardedAt) return NextResponse.json({ error: "Complete onboarding first.", needsOnboarding: true }, { status: 409 });

  try {
    await rateLimit(user.id, "ppt");
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 429 });
  }

  let body: { title?: string; guidelines?: string; slideCount?: number; templateKey?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const guidelines = String(body.guidelines ?? "").trim() || undefined;
  const slideCount = Math.min(15, Math.max(4, Number(body.slideCount) || 8));
  const templateKey = body.templateKey || undefined;

  if (title.length < 4) return NextResponse.json({ error: "Please enter a clearer topic (at least 4 characters)." }, { status: 400 });

  const input = { userId: user.id, title, slideCount, guidelines, templateKey };

  let docId: string;
  try {
    docId = await createPptDoc(input);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: `You've used all ${err.limit} free PPTs this month. Upgrade to Pro for unlimited.`, upgrade: true },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: friendlyError(err) }, { status: 400 });
  }

  after(() => runPptGeneration(docId, input));
  return NextResponse.json({ docId }, { status: 201 });
}

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const docs = await prisma.document.findMany({
    where: { ownerId: user.id, type: "PPT" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, status: true, createdAt: true, updatedAt: true },
    take: 100,
  });
  return NextResponse.json({ decks: docs });
}
