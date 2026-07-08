import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { InstallPrompt } from "@/components/install-prompt";
import { ThemeToggle } from "@/components/theme-toggle";

export function RecruiterShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-line bg-base/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="font-display text-[16px] font-bold text-cyan">Vidyas OS</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-faint">Recruiter</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-4 text-[13px] font-medium text-muted">
              <Link href="/students" className="hover:text-ink">
                Students
              </Link>
              <Link href="/jobs" className="hover:text-ink">
                Jobs
              </Link>
              <Link href="/interviews" className="hover:text-ink">
                Interviews
              </Link>
              <Link href="/messages" className="hover:text-ink">
                Messages
              </Link>
              <Link href="/support" className="hover:text-ink">
                Support
              </Link>
              <Link href="/settings" className="hover:text-ink">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserButton appearance={{ elements: { avatarBox: "width:32px;height:32px" } }} />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1200px] px-5 py-8">{children}</div>
      <InstallPrompt />
    </div>
  );
}
