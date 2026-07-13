import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { requireRecruiter } from "@/lib/recruiter";
import { NotAuthorized } from "@/components/not-authorized";
import { RecruiterLanding } from "@/components/landing";

export default async function HomePage() {
  // Logged-out visitors get the marketing pitch; everyone signed in goes through the exact
  // same guard flow as before (application status + role flag), so the recruiter workflow
  // is untouched.
  const { userId } = await auth();
  if (!userId) return <RecruiterLanding />;

  const guard = await requireRecruiter();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;
  redirect("/students");
}
