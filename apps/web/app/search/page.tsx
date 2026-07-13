import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { DocumentRow } from "@/components/document-row";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { SearchIcon } from "@/components/icons";

export const metadata = { title: "Search — krackit" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireOnboardedUser();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const docs = query
    ? await prisma.document.findMany({
        where: { ownerId: user.id, title: { contains: query, mode: "insensitive" } },
        orderBy: { updatedAt: "desc" },
        take: 40,
        select: { id: true, type: true, title: true, status: true, createdAt: true },
      })
    : [];

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1180px]">
        {/* Search field (GET form — works without JS) */}
        <form action="/search" method="get" className="mb-8">
          <div className="flex items-center gap-3 rounded-2xl border border-line-strong bg-card px-4 py-3 focus-within:border-cyan/50">
            <SearchIcon size={18} className="text-faint" />
            <input
              name="q"
              defaultValue={query}
              autoFocus
              placeholder="Search academic vault, tasks, or commands…"
              className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
            />
            <button
              type="submit"
              className="rounded-lg bg-cyan px-4 py-1.5 text-[13px] font-semibold text-on-accent"
            >
              Search
            </button>
          </div>
        </form>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-[28px] font-semibold tracking-tight text-ink">Search Results</h1>
          {query ? (
            <p className="mt-1 text-[13.5px] text-muted">
              Showing {docs.length} result{docs.length === 1 ? "" : "s"} for{" "}
              <span className="font-semibold text-cyan">&ldquo;{query}&rdquo;</span>
            </p>
          ) : (
            <p className="mt-1 text-[13.5px] text-muted">Type a query above to search across your workspace.</p>
          )}
        </div>

        <div>
          {/* Results */}
          <div>
            {query && docs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-card p-12 text-center">
                <p className="font-display text-[17px] font-semibold text-ink">No matches</p>
                <p className="mt-1 text-[13.5px] text-muted">
                  Nothing in your vault matches &ldquo;{query}&rdquo; yet.
                </p>
              </div>
            ) : (
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <SearchIcon size={18} className="text-cyan" />
                  <h2 className="font-display text-[18px] font-semibold text-ink">Documents &amp; PPTs</h2>
                  {query && (
                    <span className="ml-auto rounded bg-raised px-2 py-0.5 text-[11px] font-bold text-muted">
                      {docs.length} RESULTS
                    </span>
                  )}
                </div>
                <div className="space-y-2.5">
                  {docs.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} />
                  ))}
                  {!query && (
                    <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center text-[13.5px] text-muted">
                      Your results will appear here.
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
