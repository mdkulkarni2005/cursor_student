import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { FeedbackWidget } from "@/components/feedback-widget";
import { InstallPrompt } from "@/components/install-prompt";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export function RecruiterShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-line bg-base/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-6">
            <Link href="/">
              <Logo size={24} suffix="Recruiter" />
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
              <Link href="/plans" className="hover:text-ink">
                Plans
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
      <FeedbackWidget />
      <InstallPrompt />
    </div>
  );
}
