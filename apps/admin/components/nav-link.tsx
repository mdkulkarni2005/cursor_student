"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS_BY_HREF } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({ href }: { href: string }) {
  const pathname = usePathname();
  const item = NAV_ITEMS_BY_HREF[href];
  if (!item) return null;

  const active = isActive(pathname, href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] font-medium transition-colors",
        active ? "bg-cyan/12 text-cyan" : "text-muted hover:bg-surface hover:text-ink"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}
