import { SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-10">
      <div className="w-full max-w-[520px]">
        <SkeletonCard lines={5} />
      </div>
    </div>
  );
}
