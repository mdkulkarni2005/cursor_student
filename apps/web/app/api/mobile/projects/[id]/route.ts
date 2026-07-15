import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { getProject } from "@/lib/projects/generate";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const project = await getProject(user.id, id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json(project);
}
