import { requireSuperAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { AdminShell } from "@/components/shell";
import { listAdmins } from "@/lib/admins";
import { AdminManager } from "./admin-form";

export const metadata = { title: "Admins — Admin" };

export default async function AdminsPage() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const admins = await listAdmins();

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="font-display text-[24px] font-bold text-ink">Admins</h1>
        <p className="mt-1 text-[13px] text-muted">
          Manage who has admin access to this panel. Super-admin only.
        </p>
      </div>
      <AdminManager admins={admins} />
    </AdminShell>
  );
}
