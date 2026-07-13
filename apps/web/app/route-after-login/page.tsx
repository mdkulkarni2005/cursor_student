import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@studentos/db";

const RECRUITER_URL = process.env.NEXT_PUBLIC_RECRUITER_APP_URL ?? "http://localhost:3200";

/**
 * The one place a freshly-signed-in user from the unified krackit.in "Login" button lands.
 * app.krackit.in and recruiter.krackit.in share a Clerk session (recruiter is a satellite
 * domain — see apps/recruiter/app/layout.tsx), so an approved recruiter can be bounced straight
 * to recruiter.krackit.in already authenticated, no second sign-in.
 *
 * Mirrors apps/recruiter/lib/recruiter.ts's requireRecruiter() two-factor check exactly
 * (APPROVED status AND the Clerk role flag) so this can never contradict that guard.
 */
export default async function RouteAfterLoginPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const recruiter = await prisma.recruiter.findUnique({ where: { clerkId: user.id } });
  const isApprovedRecruiter = recruiter?.status === "APPROVED" && user.publicMetadata?.role === "recruiter";
  if (isApprovedRecruiter) redirect(`${RECRUITER_URL}/students`);

  redirect("/dashboard");
}
