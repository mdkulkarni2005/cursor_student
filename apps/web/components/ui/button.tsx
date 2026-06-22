"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** Inline spinner that inherits the current text color and font size (1em). */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const FLEX = "inline-flex items-center justify-center gap-2";

type ButtonProps = ComponentProps<"button"> & {
  /** When true, shows a spinner and disables the button. */
  loading?: boolean;
  /** Optional label to swap in while loading (falls back to children). */
  loadingText?: ReactNode;
};

/**
 * Drop-in <button> with a built-in loading state. Pass `loading` from any pending
 * source — useActionState's `pending`, a local fetch `submitting`, etc. — and the
 * button shows a spinner and disables itself. Keep all existing styling classes.
 */
export function Button({
  loading = false,
  loadingText,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${FLEX} ${className}`}
    >
      {loading ? <Spinner /> : null}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

/**
 * A spinner that renders ONLY while the nearest ancestor <Link> navigation is pending.
 * Drop it inside a card/row <Link> to add loading feedback without changing the layout.
 */
export function NavSpinner({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className={className} /> : null;
}

/** Reads the pending state of the nearest ancestor <Link> and shows a spinner. */
function LinkBusy({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? <Spinner /> : null}
      {children}
    </>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & { className?: string };

/**
 * <Link> styled as a button that shows a spinner while the navigation it triggers
 * is pending (App Router prefetch/transition). Use for navigations that hit the
 * network so the user gets immediate feedback that something is happening.
 */
export function LinkButton({ children, className = "", ...rest }: LinkButtonProps) {
  return (
    <Link {...rest} className={`${FLEX} ${className}`}>
      <LinkBusy>{children}</LinkBusy>
    </Link>
  );
}
