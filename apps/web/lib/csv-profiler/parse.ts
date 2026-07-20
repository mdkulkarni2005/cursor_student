/** Minimal CSV parser — handles quoted fields with embedded commas/quotes, no external dependency. */
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  function parseLine(line: string): string[] {
    const fields: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    fields.push(cur);
    return fields.map((f) => f.trim());
  }

  const [headerLine, ...rest] = lines;
  return { headers: parseLine(headerLine), rows: rest.map(parseLine) };
}

export type ColumnProfile = {
  name: string;
  type: "numeric" | "categorical";
  count: number;
  missing: number;
  missingPct: number;
  unique: number;
  min?: number;
  max?: number;
  mean?: number;
  std?: number;
  histogram?: { bucket: string; count: number }[];
  topValues?: { value: string; count: number }[];
  numericValues?: number[];
};

function isBlank(v: string): boolean {
  return v === "" || v.toLowerCase() === "na" || v.toLowerCase() === "n/a" || v.toLowerCase() === "null";
}

export function profileColumns(headers: string[], rows: string[][]): ColumnProfile[] {
  return headers.map((name, colIdx) => {
    const raw = rows.map((r) => r[colIdx] ?? "");
    const present = raw.filter((v) => !isBlank(v));
    const missing = raw.length - present.length;
    const numeric = present.filter((v) => v !== "" && !Number.isNaN(Number(v)));
    const isNumeric = present.length > 0 && numeric.length / present.length >= 0.8;

    const unique = new Set(present).size;

    if (isNumeric) {
      const values = numeric.map(Number);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
      const std = Math.sqrt(variance);

      const bucketCount = 8;
      const span = max - min || 1;
      const buckets = Array.from({ length: bucketCount }, (_, i) => ({
        bucket: `${(min + (i * span) / bucketCount).toFixed(1)}–${(min + ((i + 1) * span) / bucketCount).toFixed(1)}`,
        count: 0,
      }));
      for (const v of values) {
        const idx = Math.min(bucketCount - 1, Math.floor(((v - min) / span) * bucketCount));
        buckets[idx].count++;
      }

      return {
        name,
        type: "numeric",
        count: present.length,
        missing,
        missingPct: raw.length ? (missing / raw.length) * 100 : 0,
        unique,
        min,
        max,
        mean,
        std,
        histogram: buckets,
        numericValues: values,
      };
    }

    const freq = new Map<string, number>();
    for (const v of present) freq.set(v, (freq.get(v) ?? 0) + 1);
    const topValues = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([value, count]) => ({ value, count }));

    return {
      name,
      type: "categorical",
      count: present.length,
      missing,
      missingPct: raw.length ? (missing / raw.length) * 100 : 0,
      unique,
      topValues,
    };
  });
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}

export function correlationMatrix(numericColumns: ColumnProfile[]): number[][] {
  return numericColumns.map((colA) =>
    numericColumns.map((colB) => pearson(colA.numericValues ?? [], colB.numericValues ?? [])),
  );
}

export const SAMPLE_CSV = `student_id,study_hours,attendance_pct,previous_score,branch,final_score
1,5.5,88,72,CSE,78
2,2.0,60,55,ECE,48
3,7.2,95,80,CSE,90
4,4.1,75,65,Mech,66
5,1.5,50,40,Civil,38
6,6.8,92,78,CSE,85
7,3.3,70,60,ECE,58
8,8.0,98,85,CSE,94
9,2.8,65,50,Mech,45
10,5.0,80,68,Civil,70
11,6.0,85,75,ECE,79
12,1.0,45,35,Mech,30
13,7.5,93,82,CSE,88
14,4.5,78,62,Civil,64
15,3.0,68,58,ECE,55
`;
