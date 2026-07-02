import { SignOutButton } from "@clerk/nextjs";
import type { AdminGuardResult } from "@/lib/admin";

export function NotAuthorized({ reason }: { reason: Extract<AdminGuardResult, { ok: false }>["reason"] }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="max-w-[380px] rounded-2xl border border-line bg-card p-6 text-center">
        <p className="font-display text-[18px] font-bold text-ink">Not authorized</p>
        <p className="mt-1.5 text-[13px] text-muted">
          {reason === "signed-out"
            ? "You need to sign in with an admin account."
            : "Your account doesn't have admin access. Ask an existing admin to set publicMetadata.role = \"admin\" on your Clerk user."}
        </p>
        {reason === "not-admin" && (
          <div className="mt-4">
            <SignOutButton>
              <button className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-medium text-soft hover:bg-surface">
                Sign out
              </button>
            </SignOutButton>
          </div>
        )}
      </div>
    </main>
  );
}
