import { ShellSkeleton } from "@/components/ui/shell-skeleton";
import { SkeletonHeader, SkeletonCardGrid } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <div className="mx-auto max-w-[1100px]">
        <SkeletonHeader />
        <SkeletonCardGrid count={4} />
      </div>
    </ShellSkeleton>
  );
}
