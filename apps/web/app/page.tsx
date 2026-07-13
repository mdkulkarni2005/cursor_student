import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { RootLanding } from "@/components/landing/root-landing";
import { StudentLanding } from "@/components/landing/student-landing";

/**
 * One route, two landings, picked by host:
 *  - krackit.in / www.krackit.in → the brand chooser (RootLanding): "I'm a student" →
 *    app.krackit.in, "I'm a recruiter" → recruiter.krackit.in, plus company/contact info.
 *  - app.krackit.in (and local dev) → the student pitch (StudentLanding), with logged-in
 *    users going straight to /dashboard.
 * The root host never auth-redirects: the Clerk session cookie lives on the app subdomain,
 * so krackit.in can't (and shouldn't) know whether someone is signed in.
 */
export default async function LandingPage() {
  const host = (await headers()).get("host") ?? "";
  const isRootHost = host === "krackit.in" || host === "www.krackit.in";

  if (isRootHost) return <RootLanding />;

  const { userId } = await auth();
  if (userId) redirect("/dashboard");
  return <StudentLanding />;
}
