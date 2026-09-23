import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

/**
 * Mirrors ReviewsPage: the inbox sits in a max-w-4xl column (not the 7xl the
 * other teacher pages use), with a desk head, a row of three filter chips, and
 * review slips. Same widths and heights so the swap does not reflow.
 */
export default function TeacherReviewsLoading() {
  return (
    <div
      className="ms-teacher-inbox mx-auto min-w-0 max-w-4xl"
      aria-busy
      aria-label="Loading submissions"
    >
      <div className="ms-teacher-desk-head">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonBlock className="h-[22px] w-8" />
          </div>
          <SkeletonBlock className="h-10 w-72 max-w-full sm:h-11" />
          <SkeletonLine className="mt-2 h-4 w-60 max-w-full" />
        </div>
      </div>
      <div className="ms-teacher-start__choices mb-6">
        <SkeletonBlock className="h-11 w-14" />
        <SkeletonBlock className="h-11 w-36" />
        <SkeletonBlock className="h-11 w-28" />
      </div>
      <div className="ms-teacher-class-list">
        <SkeletonBlock className="h-[78px] w-full" />
        <SkeletonBlock className="h-[78px] w-full" />
        <SkeletonBlock className="h-[78px] w-full" />
      </div>
    </div>
  )
}
