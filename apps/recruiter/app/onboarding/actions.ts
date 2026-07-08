"use server";

import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma, assertPhoneAvailable } from "@studentos/db";
import { SESSION_EXPIRED_ERROR } from "./onboarding-constants";

export type OnboardingState = { error?: string };

const PHONE_RE = /^\+?[0-9]{10,15}$/;

/**
 * One upsert per submit, keyed by `clerkId` — so a dropped connection mid-onboarding never
 * leaves a half-written row: either the previous save stands, or this one fully replaces it.
 * `intent=submit` additionally requires the required fields and flips status to PENDING (queued
 * for apps/admin review); `intent=draft` just persists progress so the form can resume later.
 */
export async function saveApplication(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const user = await currentUser();
  if (!user) return { error: SESSION_EXPIRED_ERROR };

  const intent = String(formData.get("intent") ?? "draft");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const companyEmail = String(formData.get("companyEmail") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();
  const linkedinUrl = String(formData.get("linkedinUrl") ?? "").trim();

  if (phone && !PHONE_RE.test(phone)) return { error: "Please enter a valid phone number." };

  const existing = await prisma.recruiter.findUnique({ where: { clerkId: user.id } });
  if (existing && existing.status !== "DRAFT") {
    return { error: "Your application has already been submitted and can't be edited." };
  }

  if (intent === "submit") {
    if (!name) return { error: "Please enter your name." };
    if (!companyName) return { error: "Please enter your company name." };
    if (!industry) return { error: "Please choose the industry you hire for." };
    if (!phone) return { error: "Please enter a phone number." };
  }

  if (phone) {
    try {
      await assertPhoneAvailable(phone, { recruiterId: existing?.id });
    } catch (err) {
      return { error: err instanceof Error ? err.message : "That phone number is already in use." };
    }
  }

  const email =
    user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? `${user.id}@placeholder.local`;

  const data = {
    email,
    name: name || null,
    phone: phone || null,
    companyName: companyName || null,
    companyEmail: companyEmail || null,
    industry: industry || null,
    designation: designation || null,
    linkedinUrl: linkedinUrl || null,
    ...(intent === "submit" ? { status: "PENDING" as const } : {}),
  };

  await prisma.recruiter.upsert({
    where: { clerkId: user.id },
    create: { clerkId: user.id, ...data },
    update: data,
  });

  if (intent === "submit") redirect("/onboarding/submitted");
  return {};
}
