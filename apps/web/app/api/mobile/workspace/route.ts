import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";
import { getOrCreateCurrentWorkspace } from "@/lib/workspace";

const GROUP_ORDER: { type: string; label: string }[] = [
  { type: "REPORT", label: "Reports" },
  { type: "PPT", label: "Presentations" },
  { type: "ASSIGNMENT", label: "Assignments" },
  { type: "PROJECT", label: "Projects" },
  { type: "VIVA", label: "Viva prep" },
];

/** This-semester grouped documents — the mobile Workspace screen. Distinct from Vault (all-time archive). */
export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const workspace = await getOrCreateCurrentWorkspace(user);

  const docs = await prisma.document.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, title: true, status: true, feature: true, createdAt: true, updatedAt: true },
  });

  const byType = new Map<string, typeof docs>();
  for (const d of docs) {
    const list = byType.get(d.type) ?? [];
    list.push(d);
    byType.set(d.type, list);
  }

  const groups = GROUP_ORDER.filter((g) => byType.has(g.type)).map((g) => ({
    type: g.type,
    label: g.label,
    documents: byType.get(g.type)!.map(({ type: _type, ...rest }) => rest),
  }));

  return NextResponse.json({
    name: workspace.name,
    department: user.department,
    totalCount: docs.length,
    groups,
  });
}
