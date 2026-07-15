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
  // Server-to-server webhooks (Razorpay) carry no Clerk session — verified by HMAC signature
  // inside the route itself, not by auth middleware.
  "/api/webhooks/(.*)",
]);



// API clients (the mobile app, or any other non-browser caller) need a 401 they can
// branch on, not an HTML redirect to /sign-in. Covers all /api/* — not just /api/mobile/* —
// since e.g. /api/assistant is also called directly by the mobile app.
const isMobileApiRoute = createRouteMatcher(["/api/(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    try {
      const { userId } = await auth();
      if (!userId) {
        if (isMobileApiRoute(req)) {
          return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
        const signInUrl = new URL("/sign-in", req.url);
        signInUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
        return NextResponse.redirect(signInUrl);
      }
    } catch {
      if (isMobileApiRoute(req)) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
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
