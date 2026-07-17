import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";

export type SearchResult = { group: string; label: string; sublabel?: string; href: string };

const RESULTS_PER_GROUP = 5;

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ results: [] satisfies SearchResult[] }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] satisfies SearchResult[] });

  const [users, institutions, recruiters, tickets] = await Promise.all([
    prisma.user.findMany({
      where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] },
      select: { id: true, name: true, email: true },
      take: RESULTS_PER_GROUP,
    }),
    prisma.institution.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, university: true },
      take: RESULTS_PER_GROUP,
    }),
    prisma.recruiter.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { companyName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, companyName: true },
      take: RESULTS_PER_GROUP,
    }),
    prisma.supportTicket.findMany({
      where: { subject: { contains: q, mode: "insensitive" } },
      select: { id: true, subject: true, status: true },
      take: RESULTS_PER_GROUP,
    }),
  ]);

  const results: SearchResult[] = [
    ...users.map((u) => ({
      group: "Users",
      label: u.name ?? u.email,
      sublabel: u.name ? u.email : undefined,
      href: `/users/${u.id}`,
    })),
    ...institutions.map((i) => ({
      group: "Institutions",
      label: i.name,
      sublabel: i.university ?? undefined,
      href: `/institutions`,
    })),
    ...recruiters.map((r) => ({
      group: "Recruiters",
      label: r.name ?? r.email,
      sublabel: r.companyName ?? r.email,
      href: `/recruiters`,
    })),
    ...tickets.map((t) => ({
      group: "Support",
      label: t.subject,
      sublabel: t.status,
      href: `/support`,
    })),
  ];

  return NextResponse.json({ results });
}
