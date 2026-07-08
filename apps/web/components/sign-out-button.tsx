"use client";

import { useClerk } from "@clerk/nextjs";

/**
 * Clerk's <SignOutButton> wraps `children` in `React.Children.only`, which throws
 * ("multiple children components") against this Clerk version even with a single <button>
 * child — reproduces the same way in apps/admin and apps/recruiter. Sidestep it with useClerk() directly.
 */
export function SignOutButtonPlain({ className, children }: { className?: string; children: React.ReactNode }) {
  const { signOut } = useClerk();
  return (
    <button type="button" onClick={() => signOut({ redirectUrl: "/sign-in" })} className={className}>
      {children}
    </button>
  );
}
