"use client";

import { useSetTrailingCrumb } from "@/lib/breadcrumb-context";

export function SetBreadcrumb({ label }: { label: string }) {
  useSetTrailingCrumb(label);
  return null;
}
