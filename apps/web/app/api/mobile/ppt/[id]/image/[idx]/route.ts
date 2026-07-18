import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { signedDownloadUrl } from "@studentos/storage";
import { getOrCreateUser } from "@/lib/user";
import type { PptSlide } from "@studentos/documents";

/**
 * Presigned URL for a single slide's auto-generated image (R2 object key stored on
 * `slide.image`), so <Image> on mobile can load it directly — mirrors the download route.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; idx: string }> }) {
  const { id, idx } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "PPT" },
    include: { content: true },
  });
  if (!doc) return NextResponse.json({ error: "Presentation not found." }, { status: 404 });

  const slides = ((doc.content?.data as { slides?: PptSlide[] } | undefined)?.slides ?? []) as PptSlide[];
  const slide = slides[Number(idx)];
  if (!slide?.image) return NextResponse.json({ error: "No image for this slide." }, { status: 404 });

  const url = await signedDownloadUrl(slide.image);
  return NextResponse.json({ url, expiresInSeconds: 300 });
}
