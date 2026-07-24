import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ProfessionalsLanding } from "@/components/landing/professionals-landing";

export default async function ProfessionalsPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");
  return <ProfessionalsLanding />;
}
