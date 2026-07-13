import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { isSuperAdmin } from "@/lib/admin";

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const showAdminsLink = await isSuperAdmin();
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-line bg-base/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-6">
            <Link href="/">
              <Logo size={24} suffix="Admin" />
            </Link>
            <nav className="flex flex-wrap items-center gap-4 text-[13px] font-medium text-muted">
              <Link href="/" className="hover:text-ink">
                Overview
              </Link>
              <Link href="/platform" className="hover:text-ink">
                Platform
              </Link>
              <Link href="/users" className="hover:text-ink">
                Users
              </Link>
              <Link href="/payments" className="hover:text-ink">
                Payments
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
              <Link href="/recruiters" className="hover:text-ink">
                Recruiters
              </Link>
              <Link href="/support" className="hover:text-ink">
                Support
              </Link>
              <Link href="/dsa-problems" className="hover:text-ink">
                DSA
              </Link>
              <Link href="/audit" className="hover:text-ink">
                Audit
              </Link>
              {showAdminsLink && (
                <Link href="/admins" className="hover:text-ink">
                  Admins
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserButton appearance={{ elements: { avatarBox: "width:32px;height:32px" } }} />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1200px] px-5 py-8">{children}</div>
    </div>
  );
}
