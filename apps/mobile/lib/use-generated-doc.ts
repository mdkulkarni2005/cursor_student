import { useCallback, useEffect, useRef, useState } from "react";
import type { GeneratingDocDetail } from "@studentos/api-types";

/**
 * Mirrors the web's report/ppt/assignment pages: poll a GET .../:id endpoint every 2s while
 * the doc is GENERATING, stop on READY/FAILED/NEEDS_INPUT. Every generation feature's mobile
 * screen (reports, ppt, assignments, lab-reports, branch-solver) uses this same shape because
 * the backend job model (GenerationJob: QUEUED/RUNNING/NEEDS_INPUT/SUCCEEDED/FAILED) is shared.
 */
export function useGeneratedDoc(fetchDoc: (() => Promise<GeneratingDocDetail>) | null) {
  const [doc, setDoc] = useState<GeneratingDocDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    if (!fetchDoc) return;
    try {
      const next = await fetchDoc();
      setDoc(next);
      if (next.status === "GENERATING" || next.status === "QUEUED") {
        timer.current = setTimeout(poll, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this document.");
    }
  }, [fetchDoc]);

  useEffect(() => {
    poll();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poll]);

  return { doc, error, refresh: poll };
}
