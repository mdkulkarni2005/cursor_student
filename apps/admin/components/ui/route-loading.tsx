import { SkeletonCardGrid, SkeletonCard, SkeletonHeader } from "@/components/ui/skeleton";

/** Generic full-page loading state, shown instantly on navigation while the guarded page's
 * currentUser()/DB calls resolve on the server — see requireRecruiter(). */
export function ListPageLoading({ cards = 6 }: { cards?: number }) {
  return (
    <div className="mx-auto max-w-[1200px] p-6 lg:p-10">
      <SkeletonHeader />
      <SkeletonCardGrid count={cards} />
    </div>
  );
}

export function DetailPageLoading() {
  return (
    <div className="mx-auto max-w-[900px] p-6 lg:p-10">
      <SkeletonHeader />
      <SkeletonCard lines={6} />
    </div>
  );
}
