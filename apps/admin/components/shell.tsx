import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-line bg-base/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="font-display text-[16px] font-bold text-cyan">Vidyas OS</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-faint">Admin</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-4 text-[13px] font-medium text-muted">
              <Link href="/" className="hover:text-ink">
                Overview
              </Link>
              <Link href="/users" className="hover:text-ink">
                Users
              </Link>
              <Link href="/jobs" className="hover:text-ink">
                Jobs
              </Link>
              <Link href="/institutions" className="hover:text-ink">
                Institutions
              </Link>
              <Link href="/templates" className="hover:text-ink">
                Templates
              </Link>
              <Link href="/dsa-problems" className="hover:text-ink">
                DSA
              </Link>
              <Link href="/audit" className="hover:text-ink">
                Audit
              </Link>
            </nav>
          </div>
          <UserButton appearance={{ elements: { avatarBox: "width:32px;height:32px" } }} />
        </div>
      </header>
      <div className="mx-auto max-w-[1200px] px-5 py-8">{children}</div>
    </div>
  );
}
