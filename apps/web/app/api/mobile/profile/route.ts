import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";
import { setRecruiterVisibility } from "@/lib/actions/recruiter-visibility";
import type { ProfileResponse, SetRecruiterVisibilityInput } from "@studentos/api-types";

/**
 * Non-DSA profile view for mobile — DSA/interview stats are explicitly web-only (see
 * apps/web/lib/public-profile.ts PublicProfile, which mixes them in for the public /u/[handle]
 * page; this is the signed-in student's own lightweight profile instead).
 */
export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const [institution, projectDocs, resumeDoc] = await Promise.all([
    user.institutionId ? prisma.institution.findUnique({ where: { id: user.institutionId }, select: { name: true } }) : Promise.resolve(null),
    prisma.document.findMany({
      where: { ownerId: user.id, type: "PROJECT" },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: { content: true },
    }),
    prisma.document.findFirst({ where: { ownerId: user.id, type: "RESUME", status: "READY" }, orderBy: { updatedAt: "desc" }, select: { id: true } }),
  ]);

  const name = user.name ?? "Student";
  const initials = name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";

  const projects = projectDocs.map((p) => {
    const data = p.content?.data as { idea?: { summary?: string } } | undefined;
    return { id: p.id, name: p.title, summary: data?.idea?.summary ?? "" };
  });

  const response: ProfileResponse = {
    name,
    initials,
    headline: user.careerGoal ?? "Student",
    department: user.department,
    semester: user.semester,
    institution: institution?.name ?? null,
    skills: user.skills ? user.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
    links: { github: user.githubUrl ?? undefined, linkedin: user.linkedin ?? undefined },
    projects,
    gpa: user.gpa,
    resume: resumeDoc ? { id: resumeDoc.id } : null,
    publicHandle: user.publicHandle,
    recruiterVisible: user.visibleToRecruiters,
  };
  return NextResponse.json(response);
}

/** Delegates to lib/actions/recruiter-visibility.ts's setRecruiterVisibility — same underlying logic as the web toggle. */
export async function PATCH(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: SetRecruiterVisibilityInput;
  try {
    body = (await req.json()) as SetRecruiterVisibilityInput;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.visible !== "boolean") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  await setRecruiterVisibility(body.visible);
  return NextResponse.json({ ok: true });
}
