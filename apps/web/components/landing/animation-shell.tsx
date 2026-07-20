"use client";

import { useEffect, useState } from "react";

/**
 * Shared shell for every always-on landing-page card animation (branch ladder, professional
 * ladder, and any future one): same panel sizing/backdrop, same reduced-motion handling. Keeping
 * this in one place is what makes visually unrelated motifs (gears, chat bubbles, sine waves)
 * still read as one coherent system rather than N unrelated widgets.
 *
 * `prefers-reduced-motion` is handled two ways: CSS-driven loops (spins, dash-draws, blinks) are
 * killed via the media query in globals.css; SMIL `<animateMotion>` isn't reachable from CSS, so
 * those elements are simply not rendered when `usePrefersReducedMotion` reports true.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export type CardAnimationProps = { rgb: string; className?: string };

export function AnimationPanel({ rgb, className = "", children }: CardAnimationProps & { children: React.ReactNode }) {
  return (
    <div className={`relative flex size-full items-center justify-center overflow-hidden ${className}`}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 45%, rgba(${rgb}, 0.16), transparent 68%)` }}
      />
      {children}
    </div>
  );
}
