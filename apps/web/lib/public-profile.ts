import { prisma } from "@studentos/db";
import type { User } from "@studentos/db";
import { getDsaProgress } from "@/lib/dsa/practice";
import { getLeaderboard } from "@/lib/dsa/leaderboard";
import { getResume } from "@/lib/resume/generate";
import { DSA_BY_SLUG } from "@/lib/dsa/catalog";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "student";
}

/**
 * Ensure the user has a unique public handle (generated on first share). Returns the handle.
 * Collision-safe: appends a short random suffix and retries.
 */
export async function ensurePublicHandle(user: User): Promise<string> {
  if (user.publicHandle) return user.publicHandle;
  const base = slugify(user.name ?? "student");
  for (let attempt = 0; attempt < 6; attempt++) {
    const handle = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    try {
      await prisma.user.update({ where: { id: user.id }, data: { publicHandle: handle } });
      return handle;
    } catch {
      // unique collision → try another suffix
    }
  }
  // Extremely unlikely fallback.
  const handle = `${base}-${user.id.slice(-6)}`;
  await prisma.user.update({ where: { id: user.id }, data: { publicHandle: handle } });
  return handle;
}

export type PublicProfile = {
  name: string;
  initials: string;
  headline: string;
  department: string | null;
  semester: string | null;
  institution: string | null;
  skills: string[];
  links: { github?: string; linkedin?: string; portfolio?: string };
  projects: { id: string; name: string; summary: string }[];
  stats: { solved: number; rank: number | null; streak: number };
  dsaByDifficulty: { easy: number; medium: number; hard: number };
  interviews: { completed: number; completionRate: number | null };
  gpa: number | null;
  resume: { id: string } | null;
};

/** Resolve a public profile by handle, assembled entirely from the student's REAL data. */
export async function getPublicProfile(handle: string): Promise<PublicProfile | null> {
  const user = await prisma.user.findUnique({
    where: { publicHandle: handle },
    include: { institution: { select: { name: true } } },
  });
  if (!user) return null;

  const [dsa, board, projectDocs, resumeDoc, acceptedCount, completedCount] = await Promise.all([
    getDsaProgress(user.id),
    getLeaderboard(user.id),
    prisma.document.findMany({ where: { ownerId: user.id, type: "PROJECT" }, orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, title: true } }),
    prisma.document.findFirst({ where: { ownerId: user.id, type: "RESUME", status: "READY" }, orderBy: { updatedAt: "desc" }, select: { id: true } }),
    prisma.interviewSchedule.count({ where: { studentId: user.id, status: "ACCEPTED" } }),
    prisma.interviewSchedule.count({ where: { studentId: user.id, status: "COMPLETED" } }),
  ]);

  // Skills come from the student's latest resume (real), if any. Links prefer the dedicated
  // onboarding fields, falling back to the resume's parsed contact block for legacy profiles.
  let skills: string[] = [];
  let resumeLinks: { github?: string; linkedin?: string; portfolio?: string } = {};
  if (resumeDoc) {
    const r = await getResume(user.id, resumeDoc.id);
    if (r) {
      skills = r.resume.skills.flatMap((g) => g.items).slice(0, 16);
      resumeLinks = { github: r.resume.contact.github, linkedin: r.resume.contact.linkedin, portfolio: r.resume.contact.portfolio };
    }
  }
  const links: PublicProfile["links"] = {
    github: user.githubUrl ?? resumeLinks.github,
    linkedin: user.linkedin ?? resumeLinks.linkedin,
    portfolio: resumeLinks.portfolio,
  };

  // DSA solved breakdown by difficulty — joined against the static catalog, not stored per-attempt.
  const dsaByDifficulty = { easy: 0, medium: 0, hard: 0 };
  for (const slug of dsa.solvedSlugs) {
    const difficulty = DSA_BY_SLUG[slug]?.difficulty;
    if (difficulty) dsaByDifficulty[difficulty]++;
  }

  // Public-safe interview signal — completed count + completion rate, derived only from
  // InterviewSchedule.status. Never surface InterviewJudgment or outcome (recruiter-private).
  const scheduledTotal = acceptedCount + completedCount;
  const interviews = { completed: completedCount, completionRate: scheduledTotal > 0 ? completedCount / scheduledTotal : null };

  const name = user.name ?? "Student";
  return {
    name,
    initials: name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?",
    headline: user.careerGoal ?? "Student",
    department: user.department,
    semester: user.semester,
    institution: user.institution?.name ?? null,
    skills,
    links,
    projects: projectDocs.map((p) => ({ id: p.id, name: p.title, summary: "Academic project bundle" })),
    stats: { solved: dsa.solvedCount, rank: board.me?.rank ?? null, streak: dsa.streak.current },
    dsaByDifficulty,
    interviews,
    gpa: user.gpa,
    resume: resumeDoc ? { id: resumeDoc.id } : null,
  };
}
