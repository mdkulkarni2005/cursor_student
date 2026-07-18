import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { getOrCreateUser, shellUserFrom } from "@/lib/user";
import { codingEnabledFor, branchFeaturesFor } from "@/lib/capabilities";

/**
 * The mobile app's first call after sign-in: resolves/creates the Neon row for this Clerk
 * session (getOrCreateUser — the same lazy upsert web relies on, so a student who signed up
 * on web lands in the same account here with zero extra sync), and returns everything the
 * home screen needs to route (onboarded?, plan, department-based feature gating).
 */
export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  // Settings' edit form needs the college name, not just the id it's stored as.
  const institution = user.institutionId
    ? await prisma.institution.findUnique({ where: { id: user.institutionId }, select: { name: true } })
    : null;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    onboarded: Boolean(user.onboardedAt),
    userType: user.userType,
    shell: await shellUserFrom(user),
    capabilities: {
      codingEnabled: codingEnabledFor(user),
      branchFeatures: branchFeaturesFor(user.department),
    },
    profile: {
      careerGoal: user.careerGoal,
      github: user.githubUrl,
      linkedin: user.linkedin,
      gpa: user.gpa,
      college: institution?.name ?? null,
      companyName: user.companyName,
      jobTitle: user.jobTitle,
      yearsOfExperience: user.yearsOfExperience,
    },
  });
}
