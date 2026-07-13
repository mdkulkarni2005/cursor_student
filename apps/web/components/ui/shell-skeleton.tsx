import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

const NAV_ROW_WIDTHS = ["w-24", "w-32", "w-28", "w-20", "w-28", "w-24", "w-32", "w-20"];

/**
 * A loading.tsx-only shell that mirrors AppShell's static layout so a page's skeleton doesn't
 * flash in without a sidebar. Deliberately does NOT render real nav labels/hrefs from lib/nav —
 * this renders before the user's entitlements (department, plan, userType) are known, and the
 * real list is filtered per-user in app-shell.tsx's visibleNav(). Rendering the unfiltered list
 * here would leak branch-locked / professional-hidden feature names to every visitor on every
 * page load. Plain bars only — no user info either (also not yet known).
 */
function SidebarSkeleton() {
  return (
    <aside className="hidden h-screen w-[256px] shrink-0 flex-col overflow-y-auto border-r border-line bg-base px-4 py-6 lg:flex">
      <Link href="/dashboard" className="mb-7 block px-2">
        <span className="font-display text-[19px] font-bold text-cyan">krackit</span>
        <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-faint">
          Academic Intelligence
        </span>
      </Link>

      <Skeleton className="mb-6 h-[46px] w-full rounded-xl" />

      <nav className="flex-1">
        {NAV_ROW_WIDTHS.map((width, i) => (
          <div key={i} className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5">
            <Skeleton className="size-[17px] shrink-0 rounded-md" />
            <Skeleton className={`h-3.5 ${width}`} />
          </div>
        ))}
      </nav>

      <div className="my-3 h-px bg-line" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5">
          <Skeleton className="size-[17px] shrink-0 rounded-md" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      ))}

      <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-line bg-surface p-2.5">
        <Skeleton className="size-[34px] shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mt-1.5 h-3 w-16" />
        </div>
      </div>
    </aside>
  );
}

function TopbarSkeleton() {
  return (
    <header className="flex h-[66px] shrink-0 items-center gap-4 border-b border-line px-5 lg:px-7">
      <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
        <span className="font-display text-[16px] font-bold text-cyan">krackit</span>
      </Link>
      <div className="hidden max-w-[460px] flex-1 lg:block">
        <Skeleton className="h-[42px] w-full rounded-xl" />
      </div>
      <div className="ml-auto lg:hidden">
        <Skeleton className="size-8 rounded-full" />
      </div>
    </header>
  );
}

/** Wrap a route's skeleton content in this so loading.tsx matches AppShell's layout exactly. */
export function ShellSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <SidebarSkeleton />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopbarSkeleton />
        <main className="flex-1 overflow-y-auto px-4 pb-28 pt-6 sm:px-6 lg:px-7 lg:pb-10">{children}</main>
      </div>
    </div>
  );
}
