import { SignOutButtonPlain } from "@/components/sign-out-button";
import type { AdminGuardResult } from "@/lib/admin";

export function NotAuthorized({ reason }: { reason: Extract<AdminGuardResult, { ok: false }>["reason"] }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="max-w-[380px] rounded-2xl border border-line bg-card p-6 text-center">
        <p className="font-display text-[18px] font-bold text-ink">Not authorized</p>
        <p className="mt-1.5 text-[13px] text-muted">
          {reason === "signed-out"
            ? "You need to sign in with an admin account."
            : reason === "not-super-admin"
              ? "This page is restricted to super-admins. Ask an existing super-admin for access."
              : "Your account doesn't have admin access. Ask an existing admin to set publicMetadata.role = \"admin\" on your Clerk user."}
        </p>
        {reason !== "signed-out" && (
          <div className="mt-4">
            <SignOutButtonPlain className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-medium text-soft hover:bg-surface">
              Sign out
            </SignOutButtonPlain>
          </div>
        )}
      </div>
    </main>
  );
}
