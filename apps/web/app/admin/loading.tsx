import { SkeletonHeader, SkeletonCardGrid } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas px-5 py-8">
      <div className="mx-auto max-w-[1100px]">
        <SkeletonHeader />
        <SkeletonCardGrid count={5} className="sm:grid-cols-3 lg:grid-cols-5" />
      </div>
    </div>
  );
}
