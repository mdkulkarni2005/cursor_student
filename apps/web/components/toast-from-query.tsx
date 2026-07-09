"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const DEFAULT_MESSAGE = "Something went wrong — please try again.";

/**
 * Reads a `?error=<code>` query param (set by a redirect-only server action that hit a failure),
 * fires a toast for it, then strips the param from the URL so a refresh doesn't re-toast it.
 * Pass `messages` to map specific codes to friendlier copy; unknown codes fall back to a generic line.
 */
export function ToastFromQuery({ messages }: { messages?: Record<string, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const code = searchParams.get("error");

  useEffect(() => {
    if (!code) return;
    toast.error(messages?.[code] ?? DEFAULT_MESSAGE);
    router.replace(pathname);
  }, [code, messages, pathname, router]);

  return null;
}
