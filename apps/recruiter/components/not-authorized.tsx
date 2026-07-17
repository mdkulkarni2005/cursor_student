import Link from "next/link";
import { SignOutButtonPlain } from "@/components/sign-out-button";
import type { RecruiterGuardResult } from "@/lib/recruiter";

const COPY: Record<Extract<RecruiterGuardResult, { ok: false }>["reason"], { title: string; body: string }> = {
  "signed-out": { title: "Sign in", body: "You need to sign in with a recruiter account." },
  "no-application": { title: "Complete your application", body: "You haven't submitted a recruiter application yet." },
  draft: { title: "Finish your application", body: "You've started an application — pick up where you left off." },
  pending: { title: "Application under review", body: "Our team is reviewing your application. We'll be in touch once it's approved." },
  rejected: { title: "Application not approved", body: "Your recruiter application wasn't approved. Contact support if you think this is a mistake." },
  suspended: { title: "Account suspended", body: "Your recruiter account has been suspended. Contact support if you think this is a mistake." },
};

export function NotAuthorized({ reason }: { reason: Extract<RecruiterGuardResult, { ok: false }>["reason"] }) {
  const copy = COPY[reason];
  const showOnboardingLink = reason === "no-application" || reason === "draft";

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="max-w-[380px] rounded-2xl border border-line bg-card p-6 text-center">
        <p className="font-display text-[18px] font-bold text-ink">{copy.title}</p>
        <p className="mt-1.5 text-[13px] text-muted">{copy.body}</p>
        <div className="mt-4 flex justify-center gap-2">
          {showOnboardingLink && (
            <Link href="/onboarding" className="rounded-lg bg-cyan px-3 py-1.5 text-[12.5px] font-semibold text-on-accent hover:opacity-90">
              {reason === "draft" ? "Continue application" : "Start application"}
            </Link>
          )}
          {reason !== "signed-out" && (
            <SignOutButtonPlain className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-medium text-soft hover:bg-surface">
              Sign out
            </SignOutButtonPlain>
          )}
        </div>
      </div>
    </main>
  );
}
