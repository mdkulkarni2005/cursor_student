"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { UserButton, useClerk } from "@clerk/nextjs";
import { WORKSPACE_NAV, YOU_NAV, ALL_NAV, type NavItem } from "@/lib/nav";
import { SearchIcon, LogOutIcon, PanelToggleIcon } from "@/components/icons";
import { Logo, LogoMark } from "@/components/logo";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { InstallPrompt } from "@/components/install-prompt";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButtonPlain } from "@/components/sign-out-button";
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

function NavRow({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={[
        "mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
        collapsed ? "justify-center" : "",
        active
          ? "border border-cyan/20 bg-gradient-to-br from-cyan/15 to-indigo/10 font-semibold text-ink"
          : "text-muted hover:bg-surface hover:text-soft",
      ].join(" ")}
    >
      <Icon size={17} className={active ? "text-cyan" : ""} />
      {collapsed ? null : item.label}
    </Link>
  );
}

const SIDEBAR_COLLAPSED_KEY = "krackit-sidebar-collapsed";

function Sidebar({ pathname, user }: { pathname: string; user: ShellUser }) {
  const [collapsed, setCollapsed] = useState(false);

  // Read the saved preference after mount (localStorage isn't available during SSR) — a brief
  // flash from expanded to collapsed on load is the standard, accepted tradeoff for this pattern.
  useEffect(() => {
    if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true") setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  return (
    <aside
      className={[
        "hidden h-screen shrink-0 flex-col border-r border-line bg-base py-6 transition-[width] duration-150 lg:flex",
        collapsed ? "w-[76px] px-2.5" : "w-[256px] px-4",
      ].join(" ")}
    >
      <div className={`mb-7 flex items-center ${collapsed ? "flex-col gap-3" : "justify-between px-2"}`}>
        <Link href="/dashboard" className="block">
          {collapsed ? (
            <LogoMark size={28} />
          ) : (
            <>
              <Logo size={28} />
              <span className="mt-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-faint">
                Academic Intelligence
              </span>
            </>
          )}
        </Link>
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface hover:text-soft"
        >
          <PanelToggleIcon size={16} className={collapsed ? "rotate-180" : ""} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {visibleNav(WORKSPACE_NAV, user).map((item) => (
          <NavRow key={item.href} item={item} active={pathname === item.href} collapsed={collapsed} />
        ))}
      </nav>

      <div className="my-3 h-px bg-line" />
      {YOU_NAV.map((item) => (
        <NavRow key={item.href} item={item} active={pathname === item.href} collapsed={collapsed} />
      ))}
      {collapsed ? null : <FeedbackWidget variant="row" />}
    </aside>
  );
}

function Topbar({ user }: { user: ShellUser }) {
  const { openUserProfile } = useClerk();
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

      {/* Theme + account — desktop only, top-right corner. */}
      <div className="ml-auto hidden items-center gap-1 lg:flex">
        <ThemeToggle compact className="!px-2" />
        <button
          type="button"
          onClick={() => openUserProfile()}
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-surface"
          title={user.name}
        >
          <div className="pointer-events-none">
            <UserButton appearance={{ elements: { avatarBox: "width:28px;height:28px" } }} />
          </div>
        </button>
        <SignOutButtonPlain
          title="Sign out"
          className="flex items-center justify-center rounded-xl p-2 text-faint transition-colors hover:bg-surface hover:text-soft"
        >
          <LogOutIcon size={16} />
        </SignOutButtonPlain>
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
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto px-4 pb-28 pt-6 sm:px-6 lg:px-7 lg:pb-10">{children}</main>
      </div>
      <AssistantPanel name={user.name} />
      <FeedbackWidget />
      <MobileNav pathname={pathname} user={user} />
      <InstallPrompt />
    </div>
  );
}
