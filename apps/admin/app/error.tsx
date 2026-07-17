"use client";

import { useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    toast.error("Something went wrong loading this page.");
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="max-w-[380px] rounded-2xl border border-line bg-card p-6 text-center">
        <p className="font-display text-[20px] font-bold text-ink">Something went wrong</p>
        <p className="mt-1.5 text-[15px] text-muted">
          We hit a snag loading this page. Give it another try.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-cyan hover:opacity-90 px-3.5 py-1.5 text-[14.5px] font-semibold text-on-accent"
          >
            Try again
          </button>
          <Link href="/" className="rounded-lg border border-line px-3.5 py-1.5 text-[14.5px] font-medium text-soft hover:bg-surface">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
