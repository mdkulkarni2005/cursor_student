import { ShellSkeleton } from "@/components/ui/shell-skeleton";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <div className="mx-auto max-w-[1080px]">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mb-6 mt-2 h-8 w-80 max-w-full" />
        <SkeletonRows count={6} />
      </div>
    </ShellSkeleton>
  );
}
