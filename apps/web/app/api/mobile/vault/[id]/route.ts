import { NextResponse } from "next/server";
import { deleteVaultDocument } from "@/lib/actions/documents";
import { getOrCreateUser } from "@/lib/user";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await params;
  const result = await deleteVaultDocument(id);
  if (!result.ok) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
