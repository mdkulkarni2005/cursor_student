import { ShellSkeleton } from "@/components/ui/shell-skeleton";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <div className="mx-auto max-w-[1200px]">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mb-6 mt-2 h-8 w-80 max-w-full" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_300px]">
          <SkeletonCard lines={6} />
          <Skeleton className="h-64 w-full" />
          <SkeletonCard lines={5} />
        </div>
      </div>
    </ShellSkeleton>
  );
}
