import Link from "next/link";

export const metadata = { title: "Not found — krackit Recruiter" };

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="max-w-[380px] rounded-2xl border border-line bg-card p-6 text-center">
        <p className="font-display text-[18px] font-bold text-ink">Page not found</p>
        <p className="mt-1.5 text-[13px] text-muted">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div className="mt-4">
          <Link href="/" className="rounded-lg bg-accent-gradient px-3.5 py-1.5 text-[12.5px] font-semibold text-on-accent">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
