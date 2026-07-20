"use client";

/** Small bar-code style rendering of a numeric vector — used to show embeddings/Q/K/V without a full chart. */
export function MiniVector({ values, tone = "cyan" }: { values: number[]; tone?: "cyan" | "teal" | "amber" }) {
  const color = tone === "teal" ? "var(--color-teal)" : tone === "amber" ? "var(--color-scope-amber, #ffb02e)" : "var(--color-cyan)";
  return (
    <div className="flex h-8 items-center gap-[2px]">
      {values.map((v, i) => {
        const h = Math.min(1, Math.abs(v)) * 100;
        return (
          <div key={i} className="flex h-full w-2 items-center justify-center">
            <div
              className="w-full rounded-[1px]"
              style={{
                height: `${Math.max(8, h)}%`,
                backgroundColor: color,
                opacity: v < 0 ? 0.4 : 0.95,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
