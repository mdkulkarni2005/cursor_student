"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { NAV_ITEMS_FLAT } from "@/lib/nav";
import type { SearchResult } from "@/app/api/search/route";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, open]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const grouped = React.useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    if (query.trim().length < 2) return map;
    for (const r of results) {
      if (!map.has(r.group)) map.set(r.group, []);
      map.get(r.group)!.push(r);
    }
    return map;
  }, [results, query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-[14.5px] text-muted hover:bg-raised"
      >
        <span>Search or jump to…</span>
        <kbd className="rounded border border-line-strong bg-base px-1.5 py-0.5 text-[12px] font-semibold text-faint">
          ⌘K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Command Palette" description="Jump to a section or search users, institutions, recruiters, and tickets">
        <CommandInput placeholder="Jump to a section or search users, institutions…" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>{loading ? "Searching…" : "No results found."}</CommandEmpty>
          <CommandGroup heading="Sections">
            {NAV_ITEMS_FLAT.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())).map((item) => (
              <CommandItem key={item.href} value={item.label} onSelect={() => go(item.href)}>
                <item.icon className="size-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          {[...grouped.entries()].map(([group, items]) => (
            <CommandGroup key={group} heading={group}>
              {items.map((r, i) => (
                <CommandItem key={`${group}-${i}`} value={`${group}-${r.label}-${i}`} onSelect={() => go(r.href)}>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{r.label}</span>
                    {r.sublabel && <span className="truncate text-[13px] text-faint">{r.sublabel}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
