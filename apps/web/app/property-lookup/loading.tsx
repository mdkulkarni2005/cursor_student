import { ShellSkeleton } from "@/components/ui/shell-skeleton";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <div className="mx-auto max-w-[1100px]">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mb-6 mt-2 h-8 w-80 max-w-full" />
        <div className="flex flex-col gap-4">
          <SkeletonCard lines={3} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SkeletonCard lines={5} />
            <SkeletonCard lines={5} />
            <SkeletonCard lines={5} />
            <SkeletonCard lines={5} />
          </div>
        </div>
      </div>
    </ShellSkeleton>
  );
}
