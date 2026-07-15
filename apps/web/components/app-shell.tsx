"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useClerk } from "@clerk/nextjs";
import { WORKSPACE_NAV, YOU_NAV, ALL_NAV, type NavItem } from "@/lib/nav";
import { SearchIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { InstallPrompt } from "@/components/install-prompt";
import { ThemeToggle } from "@/components/theme-toggle";
import { hasBranchFeature } from "@/lib/capabilities";

export type ShellUser = {
  name: string;
  department: string | null;
  semester: string | null;
  plan: string;
  /** Coding track (DSA + coding interview). When false, DSA is hidden from default nav. */
  codingEnabled: boolean;
  /** Recruiter-led real interview — hidden unless there's an ACCEPTED schedule in the join window. */
  hasJoinableRealInterview: boolean;
  /** PROFESSIONAL only gets DSA + Interview Prep (+ Real Interview, Messages) — see lib/nav.ts studentOnly. */
  userType: "STUDENT" | "PROFESSIONAL";
};

/** Shared visibility rule for both the desktop sidebar and the mobile bottom bar. */
function visibleNav(items: NavItem[], user: ShellUser): NavItem[] {
  return items.filter(
    (item) =>
      (user.codingEnabled || item.href !== "/dsa") &&
      (user.hasJoinableRealInterview || item.href !== "/real-interview") &&
      (!item.studentOnly || user.userType !== "PROFESSIONAL") &&
      (!item.branchFeature || hasBranchFeature(user.department, item.branchFeature)),
  );
}

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={[
        "mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
        active
          ? "border border-cyan/20 bg-gradient-to-br from-cyan/15 to-indigo/10 font-semibold text-ink"
          : "text-muted hover:bg-surface hover:text-soft",
      ].join(" ")}
    >
      <Icon size={17} className={active ? "text-cyan" : ""} />
      {item.label}
    </Link>
  );
}

function userMeta(user: ShellUser): string {
  return [user.department, user.semester ? `Sem ${user.semester}` : null, user.plan]
    .filter(Boolean)
    .join(" · ");
}

function Sidebar({ pathname, user }: { pathname: string; user: ShellUser }) {
  const { openUserProfile } = useClerk();
  return (
    <aside className="hidden h-screen w-[256px] shrink-0 flex-col border-r border-line bg-base px-4 py-6 lg:flex">
      <Link href="/dashboard" className="mb-7 block px-2">
        <Logo size={28} />
        <span className="mt-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-faint">
          Academic Intelligence
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto">
        {visibleNav(WORKSPACE_NAV, user).map((item) => (
          <NavRow key={item.href} item={item} active={pathname === item.href} />
        ))}
      </nav>

      <div className="my-3 h-px bg-line" />
      {YOU_NAV.map((item) => (
        <NavRow key={item.href} item={item} active={pathname === item.href} />
      ))}

      <ThemeToggle className="mt-3 w-full justify-center border border-line" />

      <button
        type="button"
        onClick={() => openUserProfile()}
        className="mt-3 flex items-center gap-2.5 rounded-xl border border-line bg-surface p-2.5 text-left transition-colors hover:border-line-strong"
      >
        <div className="pointer-events-none">
          <UserButton appearance={{ elements: { avatarBox: "width:34px;height:34px" } }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">{user.name}</p>
          <p className="truncate text-[11px] text-faint">{userMeta(user)}</p>
        </div>
      </button>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="flex h-[66px] shrink-0 items-center gap-4 border-b border-line px-5 lg:px-7">
      {/* Mobile brand */}
      <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
        <Logo size={24} />
      </Link>

      {/* Global search across the workspace. */}
      <Link
        href="/search"
        className="hidden max-w-[460px] flex-1 items-center gap-2.5 rounded-xl border border-line-strong bg-input px-3.5 py-2.5 text-left transition-colors hover:border-cyan/40 lg:flex"
      >
        <SearchIcon size={15} className="text-faint" />
        <span className="text-[13.5px] text-faint">Search academic vault, tasks, or commands…</span>
      </Link>

      {/* Account — visible on mobile, where there's no sidebar. */}
      <div className="ml-auto lg:hidden">
        <UserButton appearance={{ elements: { avatarBox: "width:32px;height:32px" } }} />
      </div>
    </header>
  );
}

function MobileNav({ pathname, user }: { pathname: string; user: ShellUser }) {
  const items = visibleNav(ALL_NAV.filter((i) => i.mobile), user).slice(0, 5);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-base/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors",
              active ? "text-cyan" : "text-faint",
            ].join(" ")}
          >
            <Icon size={21} />
            {item.label.split(" ")[0]}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children, user }: { children: React.ReactNode; user: ShellUser }) {
  const pathname = usePathname();
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar pathname={pathname} user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-4 pb-28 pt-6 sm:px-6 lg:px-7 lg:pb-10">{children}</main>
      </div>
      <AssistantPanel name={user.name} />
      <FeedbackWidget />
      <MobileNav pathname={pathname} user={user} />
      <InstallPrompt />
    </div>
  );
}
