import { ShellSkeleton } from "@/components/ui/shell-skeleton";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <div className="mx-auto max-w-[860px]">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mb-6 mt-2 h-8 w-80 max-w-full" />
        <SkeletonCard lines={8} />
      </div>
    </ShellSkeleton>
  );
}
