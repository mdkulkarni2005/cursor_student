import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SubmittedPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="max-w-[380px] rounded-2xl border border-line bg-card p-6 text-center">
        <p className="font-display text-[18px] font-bold text-ink">Application submitted</p>
        <p className="mt-1.5 text-[13px] text-muted">
          Thanks — our team will review your details and let you know once you&apos;re approved.
        </p>
        <Link href="/" className="mt-4 inline-block rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-medium text-soft hover:bg-surface">
          Back
        </Link>
      </div>
    </main>
  );
}
