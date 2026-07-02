import { ShellSkeleton } from "@/components/ui/shell-skeleton";
import { SkeletonHeader, SkeletonCard, SkeletonRows } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <div className="mx-auto max-w-[760px]">
        <SkeletonHeader />
        <SkeletonCard className="mb-6" lines={3} />
        <SkeletonRows count={5} />
      </div>
    </ShellSkeleton>
  );
}
