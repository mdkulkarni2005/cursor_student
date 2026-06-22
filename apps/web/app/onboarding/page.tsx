import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/user";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const user = await getOrCreateUser();
  if (!user) redirect("/sign-in");
  if (user.onboardedAt) redirect("/dashboard");

  const firstName = user.name?.split(" ")[0] ?? null;
  return <OnboardingForm firstName={firstName} />;
}
