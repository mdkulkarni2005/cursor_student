"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { DsaDifficulty, DsaProblem } from "@/lib/dsa/catalog";
import { DSA_TAGS } from "@/lib/dsa/tags";

const DIFF_STYLE: Record<DsaDifficulty, string> = {
  easy: "text-success bg-success/12",
  medium: "text-warning bg-warning/12",
  hard: "text-danger bg-danger/12",
};
const DIFF_DOT: Record<DsaDifficulty, string> = { easy: "bg-success", medium: "bg-warning", hard: "bg-danger" };
const DIFF_FILTERS = ["all", "easy", "medium", "hard"] as const;

export function ProblemBrowser({
  problems,
  solvedSlugs,
  attemptedSlugs,
}: {
  problems: DsaProblem[];
  solvedSlugs: string[];
  attemptedSlugs: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const diffParam = searchParams.get("diff") ?? "all";
  const activeDiff = (DIFF_FILTERS as readonly string[]).includes(diffParam) ? (diffParam as (typeof DIFF_FILTERS)[number]) : "all";

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const t = searchParams.get("tag");
    return t ? [t] : [];
  });
  const [query, setQuery] = useState("");

  const solved = useMemo(() => new Set(solvedSlugs), [solvedSlugs]);
  const attempted = useMemo(() => new Set(attemptedSlugs), [attemptedSlugs]);

  const usedTags = useMemo(() => {
    const inUse = new Set(problems.flatMap((p) => p.tags));
    return DSA_TAGS.filter((t) => inUse.has(t));
  }, [problems]);

  function setDiff(next: string) {
    router.push(next === "all" ? "/dsa" : `/dsa?diff=${next}`);
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  const q = query.trim().toLowerCase();
  const list = problems.filter((p) => {
    if (activeDiff !== "all" && p.difficulty !== activeDiff) return false;
    if (selectedTags.length > 0 && !selectedTags.every((t) => p.tags.includes(t))) return false;
    if (q && !p.title.toLowerCase().includes(q) && !p.tags.some((t) => t.toLowerCase().includes(q))) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[20px] font-semibold text-ink">Problem Catalog</h2>
        <div className="flex gap-1.5 rounded-xl border border-line bg-card p-1">
          {DIFF_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setDiff(f)}
              className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition-colors ${activeDiff === f ? "bg-cyan text-on-accent" : "text-muted hover:text-cyan"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or tag…"
          className="w-full max-w-sm rounded-xl border border-line-strong bg-input px-3.5 py-2 text-[13px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint"
        />
        <div className="flex flex-wrap gap-1.5">
          {usedTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTag(t)}
              className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                selectedTags.includes(t) ? "border-cyan/50 bg-cyan/15 text-cyan" : "border-line bg-surface text-muted hover:text-soft"
              }`}
            >
              {t}
            </button>
          ))}
          {selectedTags.length > 0 ? (
            <button type="button" onClick={() => setSelectedTags([])} className="rounded-full px-2.5 py-1 text-[11.5px] font-medium text-muted underline hover:text-danger">
              Clear tags
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {list.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card p-5 text-[13px] text-muted">No problems match these filters.</p>
        ) : (
          list.map((pr) => {
            const status = solved.has(pr.slug) ? "solved" : attempted.has(pr.slug) ? "attempted" : "new";
            return (
              <Link key={pr.slug} href={`/dsa/${pr.slug}`} className="group flex items-center gap-3.5 rounded-2xl border border-line bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-cyan/40 hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-[15px] ${status === "solved" ? "bg-success/12 text-success" : "bg-surface text-faint"}`}>
                  {status === "solved" ? "✓" : <span className={`size-2.5 rounded-full ${DIFF_DOT[pr.difficulty]}`} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-ink group-hover:text-cyan">{pr.title}</p>
                  <p className="truncate text-[12px] text-muted">{pr.tags.join(" · ")}</p>
                </div>
                {status === "attempted" ? <span className="text-[11px] font-semibold text-warning">attempted</span> : null}
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${DIFF_STYLE[pr.difficulty]}`}>{pr.difficulty}</span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
