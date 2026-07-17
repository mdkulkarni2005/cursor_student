import { AdminChrome } from "@/components/admin-chrome";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminChrome>{children}</AdminChrome>;
}
