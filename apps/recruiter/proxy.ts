import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Every route requires a signed-in Clerk session except the sign-in screen and the root
// landing page (logged-out visitors see the recruiter marketing pitch there; app/page.tsx
// routes signed-in users through the guard as before). Application-status checking
// (requireRecruiter()) happens per-page, not here, so a signed-in but not-yet-approved
// recruiter gets a clear status page instead of a silent redirect loop.
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    try {
      const { userId, redirectToSignIn } = await auth();
      // redirectToSignIn() (not a hardcoded local URL) — this app is a Clerk satellite domain
      // in production, and only Clerk's own helper knows how to route through the primary
      // domain's sign-in and back for the cross-domain session sync to work.
      if (!userId) return redirectToSignIn({ returnBackUrl: req.url });
    } catch {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico).*).*)",
    "/(api|trpc)(.*)",
  ],
};
