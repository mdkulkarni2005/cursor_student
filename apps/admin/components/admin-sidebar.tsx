import Link from "next/link";
import { Logo } from "@/components/logo";
import { NavLink } from "@/components/nav-link";
import { NAV_GROUPS } from "@/lib/nav";
import { isSuperAdmin } from "@/lib/admin";

export async function SidebarNav() {
  const showSuperAdminItems = await isSuperAdmin();

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => !item.superAdminOnly || showSuperAdminItems);
        if (items.length === 0) return null;
        return (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-faint">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {items.map((item) => (
                <NavLink key={item.href} href={item.href} />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export async function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-r border-line bg-base md:flex md:flex-col">
      <div className="border-b border-line px-4 py-4">
        <Link href="/">
          <Logo size={22} suffix="Admin" />
        </Link>
      </div>
      <SidebarNav />
    </aside>
  );
}
