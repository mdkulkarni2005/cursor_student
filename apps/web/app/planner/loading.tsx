import { ShellSkeleton } from "@/components/ui/shell-skeleton";
import { SkeletonHeader, SkeletonRows } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <div className="mx-auto max-w-[1180px]">
        <SkeletonHeader />
        <SkeletonRows count={7} />
      </div>
    </ShellSkeleton>
  );
}
