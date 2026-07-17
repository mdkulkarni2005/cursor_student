import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <span className="font-display text-[21px] font-bold text-cyan">krackit</span>
          <span className="mt-0.5 block text-[12px] font-bold uppercase tracking-[0.18em] text-faint">
            Admin Console
          </span>
        </div>
        <SignIn fallbackRedirectUrl="/" signUpUrl="/sign-in" />
      </div>
    </main>
  );
}
