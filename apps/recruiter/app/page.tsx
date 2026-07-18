import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { requireRecruiter } from "@/lib/recruiter";
import { NotAuthorized } from "@/components/not-authorized";

export default async function HomePage() {
  // The only landing page is krackit.in — recruiter.krackit.in has no marketing pitch of its
  // own, so logged-out visitors go straight to sign-in. Everyone signed in goes through the
  // exact same guard flow as before (application status + role flag).
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const guard = await requireRecruiter();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;
  redirect("/students");
}
