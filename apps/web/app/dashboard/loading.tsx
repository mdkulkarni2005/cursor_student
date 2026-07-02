import { ShellSkeleton } from "@/components/ui/shell-skeleton";
import { SkeletonHeader, SkeletonCardGrid, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <div className="mx-auto max-w-[1480px]">
        <SkeletonHeader />
        <SkeletonCardGrid count={4} className="mb-6 lg:grid-cols-4" />
        <SkeletonCard lines={5} />
      </div>
    </ShellSkeleton>
  );
}
