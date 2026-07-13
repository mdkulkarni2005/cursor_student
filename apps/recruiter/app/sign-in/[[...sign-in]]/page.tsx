import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          <Logo size={30} suffix="Recruiter" />
        </div>
        <SignIn fallbackRedirectUrl="/" signUpUrl="/sign-in" />
      </div>
    </main>
  );
}
