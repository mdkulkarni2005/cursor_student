import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="border-b border-line px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-[1080px] items-center gap-3">
          <Skeleton className="h-5 w-40" />
        </div>
      </div>
      <main className="mx-auto max-w-[1080px] px-5 py-10 sm:px-8">
        <SkeletonCard lines={6} />
      </main>
    </div>
  );
}
