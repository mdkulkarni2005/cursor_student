import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Everything is private except the auth screens, public legal pages, the
// shareable public academic profile at /u/[handle], and Phase G4's deep-link
// handoff routes — /launch and /interview/auto-join both consume a Clerk sign-in
// TICKET to establish a session, so they must be reachable with no session yet.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/u/(.*)",
  "/launch(.*)",
  "/interview/auto-join(.*)",
]);



export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    try {
      const { userId } = await auth();
      if (!userId) {
        const signInUrl = new URL("/sign-in", req.url);
        signInUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
        return NextResponse.redirect(signInUrl);
      }
    } catch {
      // Clerk keyless-mode / env-drift errors: redirect to sign-in so the user
      // gets a fresh session rather than a cryptic "hiccuped" error page.
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
