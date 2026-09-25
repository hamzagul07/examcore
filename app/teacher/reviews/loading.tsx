import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'

/** The inbox's shape while it loads: head, the filter bar, a column of review slips. */
export default function TeacherReviewsLoading() {
  return (
    <TeacherPageContainer>
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading your scripts…</span>
        <SkeletonLine className="mb-3 h-3 w-24" />
        <SkeletonBlock className="mb-3 h-10 w-64 max-w-full" />
        <SkeletonLine className="mb-8 h-4 w-96 max-w-full" />
        <SkeletonBlock className="mb-5 h-[76px] w-full" />
        <div className="ms-review-queue" aria-hidden>
          <SkeletonBlock className="h-[88px] w-full" />
          <SkeletonBlock className="h-[88px] w-full" />
          <SkeletonBlock className="h-[88px] w-full" />
          <SkeletonBlock className="h-[88px] w-full" />
          <SkeletonBlock className="h-[88px] w-full" />
        </div>
      </div>
    </TeacherPageContainer>
  )
}
