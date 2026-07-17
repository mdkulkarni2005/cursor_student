import Link from "next/link";
import { AdminChrome } from "@/components/admin-chrome";

export const metadata = { title: "Not found — krackit Admin" };

export default function NotFound() {
  return (
    <AdminChrome>
      <div className="mx-auto max-w-[420px] rounded-2xl border border-line bg-card p-6 text-center">
        <p className="font-display text-[20px] font-bold text-ink">Page not found</p>
        <p className="mt-1.5 text-[15px] text-muted">
          That page doesn&apos;t exist or may have moved — use the sidebar or press ⌘K to jump to what you need.
        </p>
        <div className="mt-4">
          <Link href="/" className="rounded-lg bg-cyan hover:opacity-90 px-3.5 py-1.5 text-[14.5px] font-semibold text-on-accent">
            Go to overview
          </Link>
        </div>
      </div>
    </AdminChrome>
  );
}
