import { SignOutButton } from "@clerk/nextjs";

export const metadata = { title: "Account suspended — krackit" };

export default function SuspendedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="max-w-[380px] rounded-2xl border border-line bg-card p-6 text-center">
        <p className="font-display text-[18px] font-bold text-ink">Account suspended</p>
        <p className="mt-1.5 text-[13px] text-muted">
          Your account has been suspended. If you think this is a mistake, contact support.
        </p>
        <div className="mt-4">
          <SignOutButton>
            <button className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-medium text-soft hover:bg-surface">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    </main>
  );
}
