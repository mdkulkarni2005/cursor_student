import { ShellSkeleton } from "@/components/ui/shell-skeleton";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <div className="mx-auto max-w-[1180px]">
        <Skeleton className="mb-6 h-[46px] w-full rounded-xl" />
        <SkeletonRows count={6} />
      </div>
    </ShellSkeleton>
  );
}
