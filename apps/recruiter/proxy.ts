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
      const { userId } = await auth();
      if (!userId) {
        const signInUrl = new URL("/sign-in", req.url);
        signInUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
        return NextResponse.redirect(signInUrl);
      }
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
