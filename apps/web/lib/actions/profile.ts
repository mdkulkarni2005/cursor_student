"use server";

import { requireOnboardedUser } from "@/lib/user";
import { ensurePublicHandle } from "@/lib/public-profile";

/** Ensure the student has a public handle and return the shareable path (/u/[handle]). */
export async function getShareablePath(): Promise<{ path: string }> {
  const user = await requireOnboardedUser();
  const handle = await ensurePublicHandle(user);
  return { path: `/u/${handle}` };
}
