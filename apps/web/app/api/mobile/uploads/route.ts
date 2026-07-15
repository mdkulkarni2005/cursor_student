import { NextResponse } from "next/server";
import { signedUploadUrl, keys } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";

const ALLOWED_EXT = new Set(["docx", "pdf", "jpg", "jpeg", "png"]);
const MIME_BY_EXT: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

/**
 * Returns a presigned PUT URL the mobile app uploads straight to R2 (e.g. a report/PPT
 * template, an assignment photo). The client then passes the returned `key` to the
 * generation endpoint, mirroring how the web upload flow stores a key before generating.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: { ext?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const ext = String(body.ext ?? "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });

  const key = keys.upload(user.id, crypto.randomUUID(), ext);
  const url = await signedUploadUrl(key, MIME_BY_EXT[ext]);
  return NextResponse.json({ key, url, expiresInSeconds: 300 });
}
