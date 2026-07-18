import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { ensurePublicHandle } from "@/lib/public-profile";

/** Generates (or returns the existing) public share handle for the signed-in student's profile. */
export async function POST() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const handle = await ensurePublicHandle(user);
  return NextResponse.json({ handle });
}
