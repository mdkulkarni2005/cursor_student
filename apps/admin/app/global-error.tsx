"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-full bg-canvas font-sans text-soft antialiased">
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-[380px] rounded-2xl border border-line bg-card p-6 text-center">
            <p className="font-display text-[18px] font-bold text-ink">Something went wrong</p>
            <p className="mt-1.5 text-[13px] text-muted">The app hit an unexpected error. Please try again.</p>
            <div className="mt-4">
              <button
                onClick={() => reset()}
                className="rounded-lg bg-cyan hover:opacity-90 px-3.5 py-1.5 text-[12.5px] font-semibold text-on-accent"
              >
                Try again
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
