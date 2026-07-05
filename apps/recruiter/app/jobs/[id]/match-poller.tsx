"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * While scoring runs in the background (see findCandidates' after() in ../actions.ts), poll the
 * page so it flips to SUCCEEDED/FAILED on its own — same router.refresh() pattern as apps/web's
 * GeneratingPoller for report/resume generation.
 */
export function MatchPoller() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
