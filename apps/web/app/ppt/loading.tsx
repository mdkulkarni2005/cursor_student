import { ShellSkeleton } from "@/components/ui/shell-skeleton";
import { SkeletonHeader, SkeletonCard, SkeletonCardGrid } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <div className="mx-auto max-w-[900px]">
        <SkeletonHeader />
        <SkeletonCard className="mb-6" lines={4} />
        <SkeletonCardGrid count={4} />
      </div>
    </ShellSkeleton>
  );
}
