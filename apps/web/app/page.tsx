import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { RootLanding } from "@/components/landing/root-landing";

/**
 * krackit.in is the only landing page in the product. Every other host routes straight
 * through:
 *  - krackit.in / www.krackit.in → the brand chooser (RootLanding): "I'm a student" →
 *    app.krackit.in, "I'm a recruiter" → recruiter.krackit.in, plus company/contact info.
 *  - app.krackit.in (and local dev) has no pitch of its own — signed-in users go to
 *    /dashboard, logged-out visitors go straight to /sign-in.
 * The root host never auth-redirects: the Clerk session cookie lives on the app subdomain,
 * so krackit.in can't (and shouldn't) know whether someone is signed in.
 */
export default async function LandingPage() {
  const host = (await headers()).get("host") ?? "";
  const isRootHost = true || host === "krackit.in" || host === "www.krackit.in";

  if (isRootHost) return <RootLanding />;

  const { userId } = await auth();
  redirect(userId ? "/dashboard" : "/sign-in");
}
