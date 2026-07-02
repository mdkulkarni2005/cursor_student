import Link from "next/link";
import { WORKSPACE_NAV, YOU_NAV } from "@/lib/nav";
import { PlusIcon } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * A loading.tsx-only shell that mirrors AppShell's static chrome (real nav links/icons — no
 * DB needed) so a page's skeleton doesn't flash in without a sidebar. No active-route highlight
 * and no user info (both need data this component intentionally doesn't fetch) — just structure.
 */
function SidebarSkeleton() {
  return (
    <aside className="hidden h-screen w-[256px] shrink-0 flex-col overflow-y-auto border-r border-line bg-base px-4 py-6 lg:flex">
      <Link href="/dashboard" className="mb-7 block px-2">
        <span className="font-display text-[19px] font-bold text-cyan">Vidyas OS</span>
        <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-faint">
          Academic Intelligence
        </span>
      </Link>

      <Link
        href="/workspace"
        className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-cyan px-4 py-3 text-[13.5px] font-semibold text-on-accent transition-transform active:scale-[0.97]"
      >
        <PlusIcon size={17} />
        New Project
      </Link>

      <nav className="flex-1">
        {WORKSPACE_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-muted transition-colors hover:bg-surface hover:text-soft">
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="my-3 h-px bg-line" />
      {YOU_NAV.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-muted transition-colors hover:bg-surface hover:text-soft">
            <Icon size={17} />
            {item.label}
          </Link>
        );
      })}

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
        <span className="font-display text-[16px] font-bold text-cyan">Vidyas OS</span>
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
