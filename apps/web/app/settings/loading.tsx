import { ShellSkeleton } from "@/components/ui/shell-skeleton";
import { SkeletonHeader, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <div className="mx-auto max-w-[1180px]">
        <SkeletonHeader />
        <div className="flex flex-col gap-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      </div>
    </ShellSkeleton>
  );
}
