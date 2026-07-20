"use client";

import { useMemo, useState } from "react";
import { Heatmap } from "@/components/charts/heatmap";
import { parseCSV, profileColumns, correlationMatrix, SAMPLE_CSV, type ColumnProfile } from "@/lib/csv-profiler/parse";

function correlationColor(v: number): string {
  const a = Math.min(1, Math.abs(v));
  return v >= 0 ? `rgba(0, 106, 97, ${0.1 + a * 0.8})` : `rgba(186, 26, 26, ${0.1 + a * 0.8})`;
}

function Histogram({ buckets }: { buckets: { bucket: string; count: number }[] }) {
  const max = Math.max(...buckets.map((b) => b.count), 1);
  return (
    <div className="flex h-20 items-end gap-1">
      {buckets.map((b, i) => (
        <div key={i} className="group relative h-full flex-1">
          <div
            className="absolute bottom-0 w-full rounded-t bg-cyan/70 transition-colors group-hover:bg-cyan"
            style={{ height: `${Math.max(3, (b.count / max) * 100)}%` }}
          />
          <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[10px] text-canvas opacity-0 group-hover:opacity-100">
            {b.bucket}: {b.count}
          </div>
        </div>
      ))}
    </div>
  );
}

function ColumnCard({ col }: { col: ColumnProfile }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-[13px] font-semibold text-ink" title={col.name}>{col.name}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${col.type === "numeric" ? "bg-cyan/10 text-cyan" : "bg-teal/10 text-teal"}`}>
          {col.type}
        </span>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-2 text-[11px] text-muted">
        <div><span className="block font-mono text-[13px] font-semibold text-ink">{col.count}</span>rows</div>
        <div><span className="block font-mono text-[13px] font-semibold text-ink">{col.unique}</span>unique</div>
        <div><span className={`block font-mono text-[13px] font-semibold ${col.missingPct > 0 ? "text-warning" : "text-ink"}`}>{col.missingPct.toFixed(0)}%</span>missing</div>
      </div>

      {col.type === "numeric" ? (
        <>
          <div className="mb-2 grid grid-cols-2 gap-2 text-[11px] text-muted">
            <div>min <span className="font-mono font-semibold text-ink">{col.min?.toFixed(2)}</span></div>
            <div>max <span className="font-mono font-semibold text-ink">{col.max?.toFixed(2)}</span></div>
            <div>mean <span className="font-mono font-semibold text-ink">{col.mean?.toFixed(2)}</span></div>
            <div>std <span className="font-mono font-semibold text-ink">{col.std?.toFixed(2)}</span></div>
          </div>
          {col.histogram ? <Histogram buckets={col.histogram} /> : null}
        </>
      ) : (
        <div className="space-y-1">
          {col.topValues?.map((tv) => (
            <div key={tv.value} className="flex items-center gap-2 text-[11px]">
              <span className="w-16 truncate text-muted" title={tv.value}>{tv.value}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                <div className="h-full bg-teal" style={{ width: `${(tv.count / (col.count || 1)) * 100}%` }} />
              </div>
              <span className="w-8 text-right font-mono text-[10.5px] text-faint">{tv.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProfilerWorkspace() {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => (csvText ? parseCSV(csvText) : null), [csvText]);
  const columns = useMemo(() => (parsed ? profileColumns(parsed.headers, parsed.rows) : []), [parsed]);
  const numericColumns = useMemo(() => columns.filter((c) => c.type === "numeric"), [columns]);
  const corr = useMemo(() => (numericColumns.length >= 2 ? correlationMatrix(numericColumns) : null), [numericColumns]);

  function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large — keep it under 5MB for an instant in-browser profile.");
      return;
    }
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function loadSample() {
    setError(null);
    setFileName("sample-student-scores.csv");
    setCsvText(SAMPLE_CSV);
  }

  function downloadReport() {
    if (!parsed) return;
    const report = {
      file: fileName,
      rowCount: parsed.rows.length,
      columns: columns.map(({ numericValues: _numericValues, ...rest }) => rest),
      correlation: corr ? { columns: numericColumns.map((c) => c.name), matrix: corr } : null,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName?.replace(/\.csv$/i, "") || "dataset"}-profile.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-4">
        <label className="cursor-pointer rounded-lg border border-line bg-surface px-3.5 py-2 text-[12.5px] font-semibold text-ink hover:border-cyan/50">
          Upload a CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
        <button type="button" onClick={loadSample} className="rounded-lg border border-line bg-surface px-3.5 py-2 text-[12.5px] font-semibold text-ink hover:border-cyan/50">
          Try a sample dataset
        </button>
        {fileName ? <span className="text-[12px] text-muted">{fileName} · {parsed?.rows.length ?? 0} rows</span> : null}
        {parsed ? (
          <button type="button" onClick={downloadReport} className="ml-auto rounded-lg bg-cyan px-3.5 py-2 text-[12.5px] font-semibold text-on-accent hover:opacity-90">
            Download report (JSON)
          </button>
        ) : null}
      </div>

      {error ? <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">{error}</p> : null}

      {!parsed ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface/40 p-8 text-center">
          <p className="text-[13px] font-medium text-ink">Upload a CSV or try the sample dataset</p>
          <p className="max-w-[360px] text-[12px] text-muted">
            Get instant column stats, missing-value rates, distributions, and a correlation heatmap — entirely in your browser, nothing is uploaded anywhere.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {columns.map((col) => (
              <ColumnCard key={col.name} col={col} />
            ))}
          </div>

          {corr ? (
            <Heatmap
              title="Correlation matrix (numeric columns) — teal = positive, red = negative"
              rowLabels={numericColumns.map((c) => c.name)}
              colLabels={numericColumns.map((c) => c.name)}
              values={corr}
              cellColor={correlationColor}
            />
          ) : (
            <p className="rounded-lg border border-line bg-surface/40 p-3 text-[12px] text-muted">
              Need at least 2 numeric columns to compute a correlation matrix.
            </p>
          )}
        </>
      )}
    </div>
  );
}
