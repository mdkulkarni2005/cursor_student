// Exact-matched by OnboardingForm to swap the generic error banner for a "Sign in again" link —
// this fires when a stale/cached onboarding page is submitted after the session has expired.
// Lives outside onboarding.ts because a "use server" file may only export async functions.
export const SESSION_EXPIRED_ERROR = "You must be signed in.";
