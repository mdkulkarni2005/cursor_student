"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Fires a toast whenever `message` becomes a new truthy value. Pairs with the inline error
 * box already rendered next to `useActionState` forms — the toast catches the user's eye even
 * if the form is scrolled out of view, the box stays for detail.
 */
export function useErrorToast(message?: string | null) {
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (message && message !== last.current) toast.error(message);
    last.current = message ?? null;
  }, [message]);
}
