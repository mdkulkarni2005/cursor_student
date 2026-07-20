"use client";

import { useState } from "react";
import { SlumpTest } from "@/components/material-test/slump-test";
import { CompressionTest } from "@/components/material-test/compression-test";

type TestKind = "slump" | "compression";

export function MaterialTestWorkspace() {
  const [kind, setKind] = useState<TestKind>("slump");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-lg border border-line bg-surface p-1 lg:w-fit">
        <button
          type="button"
          onClick={() => setKind("slump")}
          className={`rounded-md px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${kind === "slump" ? "bg-blueprint text-white" : "text-muted hover:text-ink"}`}
        >
          Slump Test
        </button>
        <button
          type="button"
          onClick={() => setKind("compression")}
          className={`rounded-md px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${kind === "compression" ? "bg-blueprint text-white" : "text-muted hover:text-ink"}`}
        >
          Compression Test
        </button>
      </div>

      {kind === "slump" ? <SlumpTest /> : <CompressionTest />}
    </div>
  );
}
