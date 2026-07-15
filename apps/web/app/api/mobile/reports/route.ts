import { NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";
import { createReportDoc, runReportGeneration } from "@/lib/reports/generate";
import { QuotaExceededError } from "@/lib/entitlements";
import { rateLimit, friendlyError } from "@/lib/reliability";
import { REPORT_TYPES } from "@/lib/constants";

/**
 * Same create-fast-then-generate-in-the-background pattern as the web Server Action
 * (lib/actions/reports.ts) — the client gets a docId immediately and polls
 * GET /api/mobile/reports/:id for progress, same as the web report page does.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!user.onboardedAt) return NextResponse.json({ error: "Complete onboarding first.", needsOnboarding: true }, { status: 409 });

  try {
    await rateLimit(user.id, "report");
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 429 });
  }

  let body: { title?: string; reportType?: string; guidelines?: string; templateKey?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const reportType = String(body.reportType ?? "").trim();
  const guidelines = String(body.guidelines ?? "").trim() || undefined;
  const templateKey = body.templateKey || undefined;

  if (title.length < 4) return NextResponse.json({ error: "Please enter a clearer report topic (at least 4 characters)." }, { status: 400 });
  if (!REPORT_TYPES.some((t) => t.value === reportType)) return NextResponse.json({ error: "Please choose a report type." }, { status: 400 });

  const input = { userId: user.id, title, reportType, guidelines, templateKey, interactive: true };

  let docId: string;
  try {
    docId = await createReportDoc(input);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: `You've used all ${err.limit} free reports this month. Upgrade to Pro for unlimited reports.`, upgrade: true },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: friendlyError(err) }, { status: 400 });
  }

  after(() => runReportGeneration(docId, input));
  return NextResponse.json({ docId }, { status: 201 });
}

/** List the signed-in student's reports (most recent first), for the mobile vault/home screen. */
export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const docs = await prisma.document.findMany({
    where: { ownerId: user.id, type: "REPORT" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, status: true, createdAt: true, updatedAt: true },
    take: 100,
  });
  return NextResponse.json({ reports: docs });
}
