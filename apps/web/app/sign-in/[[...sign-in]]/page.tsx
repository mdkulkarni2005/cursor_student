import { SignIn } from "@clerk/nextjs";
import { AuthAside } from "@/components/auth-aside";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen bg-canvas">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-8">
            <span className="font-display text-[19px] font-bold text-cyan">krackit</span>
            <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-faint">Academic Intelligence</span>
          </div>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-ink">Welcome Back</h1>
          <p className="mb-6 mt-1.5 text-[14px] text-muted">Access your academic workspace and AI tools.</p>
          <SignIn />
        </div>
      </div>
      <AuthAside />
    </main>
  );
}
