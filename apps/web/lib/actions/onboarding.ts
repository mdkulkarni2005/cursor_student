"use server";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@studentos/db";
import { DEPARTMENTS } from "@/lib/constants";

export type OnboardingState = { error?: string };

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const { userId } = await auth();
  if (!userId) return { error: "You must be signed in." };

  const department = String(formData.get("department") ?? "").trim();
  const college = String(formData.get("college") ?? "").trim();
  const semester = String(formData.get("semester") ?? "").trim();
  const codingEnabled = formData.get("codingEnabled") === "on";
  const acceptedLegal = formData.get("acceptedLegal") === "on";

  if (!DEPARTMENTS.includes(department as (typeof DEPARTMENTS)[number]))
    return { error: "Please choose your department." };
  if (college.length < 2) return { error: "Please enter your college name." };
  if (!semester) return { error: "Please choose your semester." };
  if (!acceptedLegal) return { error: "Please accept the Terms and Privacy Policy to continue." };

  // Find-or-create the institution (college), then attach to the user.
  let institution = await prisma.institution.findFirst({ where: { name: college } });
  institution ??= await prisma.institution.create({ data: { name: college } });

  // One submit sets academic context, coding track, AND legal acceptance — no separate gate.
  await prisma.user.update({
    where: { clerkId: userId },
    data: {
      department,
      semester,
      institutionId: institution.id,
      codingEnabled,
      acceptedLegalAt: new Date(),
      onboardedAt: new Date(),
    },
  });

  redirect("/dashboard");
}
