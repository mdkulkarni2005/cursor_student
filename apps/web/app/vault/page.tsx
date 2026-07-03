import Link from "next/link";
import { prisma } from "@studentos/db";
import type { DocumentType } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { SearchIcon, SlidesIcon, PencilIcon, ResumeIcon, MicIcon, CodeIcon } from "@/components/icons";
import { DeleteDocButton } from "@/components/vault/delete-doc-button";

const FILTERS = [
  { label: "All", value: "" },
  { label: "Reports", value: "REPORT" },
  { label: "PPTs", value: "PPT" },
  { label: "Assignments", value: "ASSIGNMENT" },
  { label: "Projects", value: "PROJECT" },
] as const;

const TYPE_META: Record<string, { icon: typeof SlidesIcon; tint: string; href: (id: string) => string }> = {
  REPORT: { icon: SlidesIcon, tint: "bg-cyan/12 text-cyan", href: (id) => `/reports/${id}` },
  PPT: { icon: SlidesIcon, tint: "bg-indigo/15 text-indigo", href: (id) => `/ppt/${id}` },
  ASSIGNMENT: { icon: PencilIcon, tint: "bg-danger/12 text-danger", href: (id) => `/assignments/${id}` },
  PROJECT: { icon: CodeIcon, tint: "bg-warning/15 text-warning", href: (id) => `/projects/${id}` },
  RESUME: { icon: ResumeIcon, tint: "bg-teal/12 text-teal", href: (id) => `/resume/${id}` },
  INTERVIEW: { icon: MicIcon, tint: "bg-indigo/15 text-indigo", href: () => "/interview" },
};

const STATUS_BADGE: Record<string, string> = {
  READY: "bg-success/12 text-success",
  GENERATING: "bg-cyan/12 text-cyan",
  QUEUED: "bg-surface text-muted",
  NEEDS_INPUT: "bg-warning/15 text-warning",
  FAILED: "bg-danger/12 text-danger",
  DRAFT: "bg-surface text-muted",
};

function relTime(d: Date): string {
  const h = Math.round((Date.now() - d.getTime()) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function VaultPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { q, type } = await searchParams;
  const user = await requireOnboardedUser();

  const typeFilter = FILTERS.some((f) => f.value && f.value === type) ? (type as DocumentType) : undefined;
  const query = q?.trim();

  const [docs, reportCount, pptCount, assignmentCount, totalCount, latest] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: user.id, ...(typeFilter ? { type: typeFilter } : {}), ...(query ? { title: { contains: query, mode: "insensitive" } } : {}) },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.document.count({ where: { ownerId: user.id, type: "REPORT" } }),
    prisma.document.count({ where: { ownerId: user.id, type: "PPT" } }),
    prisma.document.count({ where: { ownerId: user.id, type: "ASSIGNMENT" } }),
    prisma.document.count({ where: { ownerId: user.id } }),
    prisma.document.findFirst({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
  ]);

  const chipHref = (value: string) => {
    const params = new URLSearchParams();
    if (value) params.set("type", value);
    if (query) params.set("q", query);
    const qs = params.toString();
    return qs ? `/vault?${qs}` : "/vault";
  };

  const TILES = [
    { label: "Reports", value: reportCount, icon: SlidesIcon, tint: "text-cyan" },
    { label: "Presentations", value: pptCount, icon: SlidesIcon, tint: "text-indigo" },
    { label: "Assignments", value: assignmentCount, icon: PencilIcon, tint: "text-danger" },
    { label: "Recent", value: latest ? relTime(latest.updatedAt) : "—", icon: SearchIcon, tint: "text-teal" },
  ];

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1100px]">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[30px] font-semibold tracking-tight text-ink">Vault</h1>
            <p className="mt-1 text-[14px] text-muted">Your central repository for all academic assets and AI-generated intelligence.</p>
          </div>
          <form action="/vault" method="get" className="flex w-full max-w-[320px] items-center gap-2.5 rounded-xl border border-line-strong bg-card px-3.5 py-2.5">
            <SearchIcon size={16} className="text-faint" />
            <input name="q" defaultValue={query ?? ""} placeholder="Search the Vault…" className="flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-faint" />
            {typeFilter ? <input type="hidden" name="type" value={typeFilter} /> : null}
          </form>
        </div>

        {/* Stat tiles */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {TILES.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="rounded-2xl border border-line bg-card p-5">
                <Icon size={20} className={t.tint} />
                <p className="mt-3 font-display text-[22px] font-bold text-ink">{t.value}</p>
                <p className="text-[11.5px] uppercase tracking-wide text-muted">{t.label}</p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = (f.value || undefined) === typeFilter;
            return (
              <Link key={f.label} href={chipHref(f.value)} className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${active ? "border-cyan/40 bg-cyan/12 text-cyan" : "border-line bg-card text-muted hover:text-cyan"}`}>
                {f.label}
              </Link>
            );
          })}
        </div>

        {/* Card grid */}
        {docs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-card p-12 text-center">
            <p className="text-[14px] text-muted">{query || typeFilter ? "Nothing matches that." : "Your vault is empty."}</p>
            <p className="mt-1 text-[12.5px] text-faint">Generate a report and it&apos;ll be saved here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {docs.map((d) => {
              const meta = TYPE_META[d.type] ?? TYPE_META.REPORT;
              const Icon = meta.icon;
              return (
                <div key={d.id} className="group/card relative">
                  <Link href={meta.href(d.id)} className="group flex h-full flex-col rounded-2xl border border-line bg-card p-4 transition-all hover:-translate-y-1 hover:border-cyan/40 hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]">
                    <div className="mb-4 flex items-start justify-between">
                      <span className={`flex size-10 items-center justify-center rounded-xl ${meta.tint}`}><Icon size={19} /></span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-opacity group-hover/card:opacity-0 ${STATUS_BADGE[d.status] ?? STATUS_BADGE.DRAFT}`}>
                        {d.status === "READY" ? "Ready" : d.status === "GENERATING" ? "Generating" : d.status === "NEEDS_INPUT" ? "Input" : d.status === "FAILED" ? "Failed" : "Draft"}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[14px] font-semibold text-ink group-hover:text-cyan">{d.title}</p>
                    <p className="mt-auto pt-3 text-[11.5px] text-muted">Modified {relTime(d.updatedAt)}</p>
                  </Link>
                  <DeleteDocButton docId={d.id} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
