import { ShellSkeleton } from "@/components/ui/shell-skeleton";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <div className="mx-auto max-w-[1400px]">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mb-6 mt-2 h-8 w-80 max-w-full" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_290px]">
          <Skeleton className="h-[420px] w-full" />
          <Skeleton className="h-[65vh] min-h-[420px] w-full" />
          <SkeletonCard lines={4} />
        </div>
      </div>
    </ShellSkeleton>
  );
}
