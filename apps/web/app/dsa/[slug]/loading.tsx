import { ShellSkeleton } from "@/components/ui/shell-skeleton";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <div className="mx-auto max-w-[1180px]">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mb-6 mt-2 h-8 w-80 max-w-full" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkeletonCard lines={6} />
          <Skeleton className="h-[420px] w-full" />
        </div>
      </div>
    </ShellSkeleton>
  );
}
