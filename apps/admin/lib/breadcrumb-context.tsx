"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type TrailingCrumb = { label: string } | null;

const BreadcrumbContext = createContext<{
  trailing: TrailingCrumb;
  setTrailing: (crumb: TrailingCrumb) => void;
} | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [trailing, setTrailing] = useState<TrailingCrumb>(null);
  return <BreadcrumbContext.Provider value={{ trailing, setTrailing }}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumbContext() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) throw new Error("useBreadcrumbContext must be used within BreadcrumbProvider");
  return ctx;
}

/** Lets a dynamic-segment page (e.g. /users/[id]) replace the trailing breadcrumb — which would
 * otherwise just be the top-level section label — with the entity's actual name. Render once,
 * anywhere, in a detail page; unmounts clean up automatically. */
export function useSetTrailingCrumb(label: string | null) {
  const { setTrailing } = useBreadcrumbContext();
  useEffect(() => {
    setTrailing(label ? { label } : null);
    return () => setTrailing(null);
  }, [label, setTrailing]);
}
