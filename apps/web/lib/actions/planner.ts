"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@studentos/db";
import { requireOnboardedUser } from "@/lib/user";

export type RoadmapDay = { day: string; label?: string; items: { text: string; kind: string }[] };

/**
 * Build a deterministic N-day sprint. Without per-topic data we generate a balanced
 * Core → Revision → Mock rhythm so the plan is structured and reproducible.
 */
function buildRoadmap(exam: string, days: number): RoadmapDay[] {
  const focus = exam.trim() || "your exam";
  const out: RoadmapDay[] = [];
  for (let i = 1; i <= days; i++) {
    const isMock = i % 6 === 0;
    const isRevision = i % 3 === 0 && !isMock;
    const items: { text: string; kind: string }[] = isMock
      ? [{ text: `Mock Test #${Math.floor(i / 6)}`, kind: "mock" }]
      : isRevision
        ? [{ text: `Revision · ${focus}`, kind: "revision" }]
        : [{ text: `Core topic ${i}`, kind: "core" }];
    out.push({ day: `D${i}${i === 2 ? " (Today)" : ""}`, items });
  }
  return out;
}

export async function generateStudyPlan(formData: FormData): Promise<void> {
  const user = await requireOnboardedUser();
  const targetExam = String(formData.get("targetExam") ?? "").trim() || "Final Exam";
  const dateRaw = String(formData.get("examDate") ?? "").trim();
  const examDate = dateRaw ? new Date(dateRaw) : null;

  let days = 15;
  if (examDate && !Number.isNaN(examDate.getTime())) {
    const d = Math.ceil((examDate.getTime() - Date.now()) / 86_400_000);
    days = Math.max(3, Math.min(21, d));
  }

  // Readiness: a rough estimate from how many documents the user already has for context.
  const docCount = await prisma.document.count({ where: { ownerId: user.id } });
  const readiness = Math.min(85, 40 + docCount * 3);

  await prisma.studyPlan.create({
    data: {
      userId: user.id,
      targetExam,
      examDate: examDate && !Number.isNaN(examDate.getTime()) ? examDate : null,
      readiness,
      roadmap: buildRoadmap(targetExam, days),
    },
  });
  revalidatePath("/planner");
}
