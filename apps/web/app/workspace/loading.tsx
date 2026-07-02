import { ShellSkeleton } from "@/components/ui/shell-skeleton";
import { SkeletonHeader, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <div className="mx-auto max-w-[820px]">
        <SkeletonHeader />
        <SkeletonCard lines={4} />
      </div>
    </ShellSkeleton>
  );
}
