/** A pulsing placeholder block — the base primitive every route's loading.tsx composes from. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface ${className}`} />;
}

/** One line of placeholder text. */
export function SkeletonText({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-3.5 ${className}`} />;
}

/** A card-shaped placeholder matching the app's `rounded-2xl border border-line bg-card p-*` cards. */
export function SkeletonCard({ className = "", lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={`rounded-2xl border border-line bg-card p-5 ${className}`}>
      <Skeleton className="mb-3 h-5 w-2/3" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonText key={i} className={i === lines - 1 ? "w-1/2" : "w-full"} />
        ))}
      </div>
    </div>
  );
}

/** A grid of card placeholders — the shape most list pages (Projects, DSA, Resume, Reports, …) use. */
export function SkeletonCardGrid({ count = 6, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** A single-column list of row placeholders — for list-style pages (Vault, Deadlines, …). */
export function SkeletonRows({ count = 5, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

/** A page-header placeholder (title + subtitle) — the top of nearly every route. */
export function SkeletonHeader({ className = "" }: { className?: string }) {
  return (
    <div className={`mb-6 ${className}`}>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-96 max-w-full" />
    </div>
  );
}
