"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { NAV_LABELS } from "@/lib/nav";
import { useBreadcrumbContext } from "@/lib/breadcrumb-context";

export type Crumb = { label: string; href?: string };

/** Auto-derives crumbs from the current pathname against the static NAV_LABELS map. Pages with
 * dynamic segments (e.g. /users/[id]) render <SetBreadcrumb label={...} /> to override the
 * trailing crumb with the entity's actual name instead of its id. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const { trailing } = useBreadcrumbContext();

  const crumbs: Crumb[] = (() => {
    if (pathname === "/") return [{ label: "Overview" }];
    const topSegment = `/${pathname.split("/").filter(Boolean)[0]}`;
    const label = NAV_LABELS[topSegment] ?? topSegment.replace("/", "");
    const isTopLevel = pathname === topSegment;
    if (trailing) return [{ label, href: topSegment }, { label: trailing.label }];
    return [{ label, href: isTopLevel ? undefined : topSegment }];
  })();

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[15px]">
      <Link href="/" className="shrink-0 text-muted hover:text-ink">
        Admin
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex min-w-0 items-center gap-1.5">
          <ChevronRight className="size-3.5 shrink-0 text-faint" />
          {crumb.href ? (
            <Link href={crumb.href} className="truncate text-muted hover:text-ink">
              {crumb.label}
            </Link>
          ) : (
            <span className="truncate font-medium text-ink">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
