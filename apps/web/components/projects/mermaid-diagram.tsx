"use client";

import { useEffect, useId, useState } from "react";
import { Lightbox } from "@/components/ui/lightbox";

/**
 * Renders one Mermaid diagram to inline SVG. Client-only (Mermaid touches the DOM directly),
 * dynamically imported like the CodeMirror editor in solve-editor.tsx so it never runs on the server.
 * Small by default (a card in a grid); click to open it fullscreen and actually read it.
 */
export function MermaidDiagram({ mermaid: source, label }: { mermaid: string; label: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("mermaid").then(async (mod) => {
      const mermaid = mod.default;
      mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });
      try {
        const { svg: rendered } = await mermaid.render(`mermaid-${id}`, source);
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setError("Couldn't render this diagram.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, source]);

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
        {svg ? <span className="text-[11px] text-faint">click to zoom ⤢</span> : null}
      </div>
      {error ? (
        <p className="text-[12px] text-warning">{error}</p>
      ) : svg ? (
        <Lightbox
          label={label}
          trigger={<div className="overflow-x-auto [&_svg]:mx-auto [&_svg]:max-h-[220px]" dangerouslySetInnerHTML={{ __html: svg }} />}
        >
          <div className="mx-auto max-w-[min(1400px,100%)] rounded-xl bg-white p-6 [&_svg]:!h-auto [&_svg]:!w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        </Lightbox>
      ) : (
        <p className="text-[12px] text-faint">Rendering…</p>
      )}
    </div>
  );
}
