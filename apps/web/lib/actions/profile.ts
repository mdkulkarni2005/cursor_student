"use server";

import { prisma } from "@studentos/db";
import { requireOnboardedUser } from "@/lib/user";
import { ensurePublicHandle } from "@/lib/public-profile";

export type ShareableResult = { ok: true; path: string } | { ok: false; error: string };

/**
 * Ensure the student has a public handle and return the shareable path (/u/[handle]) — but only
 * once GitHub, LinkedIn, and a ready resume are in place, since the public profile is built from
 * them. Returns a specific error instead of the generic failure the button used to show.
 */
export async function getShareablePath(): Promise<ShareableResult> {
  const user = await requireOnboardedUser();

  if (!user.githubUrl) return { ok: false, error: "Add your GitHub link before sharing your profile." };
  if (!user.linkedin) return { ok: false, error: "Add your LinkedIn link before sharing your profile." };

  const resume = await prisma.document.findFirst({ where: { ownerId: user.id, type: "RESUME", status: "READY" }, select: { id: true } });
  if (!resume) return { ok: false, error: "Generate or upload your resume before sharing your profile." };

  const handle = await ensurePublicHandle(user);
  return { ok: true, path: `/u/${handle}` };
}
