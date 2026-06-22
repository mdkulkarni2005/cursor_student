import Link from "next/link";
import { prisma } from "@studentos/db";
import type { DocumentType } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { DocumentRow } from "@/components/document-row";
import { SearchIcon } from "@/components/icons";

const FILTERS = [
  { label: "All", value: "" },
  { label: "Reports", value: "REPORT" },
  { label: "PPTs", value: "PPT" },
  { label: "Assignments", value: "ASSIGNMENT" },
  { label: "Projects", value: "PROJECT" },
] as const;

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q, type } = await searchParams;
  const user = await requireOnboardedUser();

  const typeFilter = FILTERS.some((f) => f.value && f.value === type) ? (type as DocumentType) : undefined;
  const query = q?.trim();

  const docs = await prisma.document.findMany({
    where: {
      ownerId: user.id,
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const chipHref = (value: string) => {
    const params = new URLSearchParams();
    if (value) params.set("type", value);
    if (query) params.set("q", query);
    const qs = params.toString();
    return qs ? `/vault?${qs}` : "/vault";
  };

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[820px]">
        <h1 className="font-display text-[22px] font-bold text-ink">Academic Vault</h1>
        <p className="mb-5 mt-1.5 text-[14px] text-muted">
          Everything you&apos;ve generated, searchable in one place.
        </p>

        {/* Search */}
        <form action="/vault" method="get" className="mb-3 flex items-center gap-2.5 rounded-xl border border-line-strong bg-input px-3.5 py-2.5">
          <SearchIcon size={16} className="text-faint" />
          <input
            name="q"
            defaultValue={query ?? ""}
            placeholder="Search your work…"
            className="flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
          />
          {typeFilter ? <input type="hidden" name="type" value={typeFilter} /> : null}
        </form>

        {/* Type filters */}
        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = (f.value || undefined) === typeFilter;
            return (
              <Link
                key={f.label}
                href={chipHref(f.value)}
                className={[
                  "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  active
                    ? "border-cyan/40 bg-cyan/12 text-cyan"
                    : "border-line-strong bg-surface text-muted hover:text-soft",
                ].join(" ")}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        {docs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-card/50 p-10 text-center">
            <p className="text-[14px] text-muted">
              {query || typeFilter ? "Nothing matches that." : "Your vault is empty."}
            </p>
            <p className="mt-1 text-[12.5px] text-faint">
              Generate a report and it&apos;ll be saved here automatically.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {docs.map((d) => (
              <DocumentRow key={d.id} doc={d} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
