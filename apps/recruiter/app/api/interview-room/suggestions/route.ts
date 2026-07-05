import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { generateLiveSuggestions } from "@studentos/ai";
import { requireRecruiter } from "@/lib/recruiter";

/**
 * Returns an updated on-screen suggestion list for a live interview, given the recruiter's current
 * list and the transcript captured so far. Stateless server-side — the recruiter's client owns the
 * list between polls (see suggestions-panel.tsx) and sends it back each time so the model can keep
 * unasked suggestions stable in place rather than reshuffling the whole panel.
 */
export async function POST(req: Request) {
  const guard = await requireRecruiter();
  if (!guard.ok) return NextResponse.json({ error: "Sign in as an approved recruiter." }, { status: 401 });

  let body: { scheduleId?: string; currentSuggestions?: string[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const scheduleId = String(body.scheduleId ?? "");
  const currentSuggestions = Array.isArray(body.currentSuggestions) ? body.currentSuggestions.map(String) : [];
  if (!scheduleId) return NextResponse.json({ error: "Missing scheduleId." }, { status: 400 });

  const schedule = await prisma.interviewSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || schedule.recruiterId !== guard.recruiter.id) {
    return NextResponse.json({ error: "Interview not found." }, { status: 404 });
  }

  const [lines, posting] = await Promise.all([
    prisma.interviewTranscriptLine.findMany({
      where: { scheduleId },
      orderBy: { occurredAt: "asc" },
      take: 200,
    }),
    schedule.jobPostingId ? prisma.jobPosting.findUnique({ where: { id: schedule.jobPostingId } }) : null,
  ]);

  const positionContext = posting
    ? `${posting.title}\n${posting.description}`
    : schedule.note ?? undefined;

  const { suggestions } = await generateLiveSuggestions({
    transcriptLines: lines.map((l) => ({ speaker: l.speaker, text: l.text })),
    positionContext,
    currentSuggestions,
  });

  return NextResponse.json({ suggestions });
}
