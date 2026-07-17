import { AdminSidebar, SidebarNav } from "@/components/admin-sidebar";
import { AdminTopbar } from "@/components/admin-topbar";
import { BreadcrumbProvider } from "@/lib/breadcrumb-context";

/** Shared sidebar+topbar shell. Used by the (dashboard) route group layout for every real page,
 * and by the root not-found.tsx — Next only renders the root not-found for a genuinely unmatched
 * URL, so it needs its own copy of the chrome to avoid dead-ending outside the shell. */
export function AdminChrome({ children }: { children: React.ReactNode }) {
  return (
    <BreadcrumbProvider>
      <div className="flex min-h-screen bg-canvas">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar mobileNav={<SidebarNav />} />
          <main className="mx-auto w-full max-w-[1200px] px-5 py-8">{children}</main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}
