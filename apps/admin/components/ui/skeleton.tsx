import type { CSSProperties } from "react";

/** Route-level loading skeletons — Next.js renders these instantly on navigation while the
 * server component's currentUser()/DB calls resolve, so clicks feel immediate instead of frozen. */
export function SkeletonBlock({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`animate-pulse rounded-xl bg-line/60 ${className}`} style={style} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <SkeletonBlock className="mb-3 h-4 w-1/3" />
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBlock key={i} className="h-3" style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonCardGrid({ count = 4, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </div>
  );
}

export function SkeletonHeader() {
  return (
    <div className="mb-6">
      <SkeletonBlock className="mb-2 h-3 w-24" />
      <SkeletonBlock className="h-7 w-64" />
    </div>
  );
}
