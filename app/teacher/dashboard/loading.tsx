import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'

/** The desk's shape while it loads: head, three Needs-you tiles, class slips. */
export default function TeacherDashboardLoading() {
  return (
    <TeacherPageContainer>
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading your desk…</span>
        <SkeletonLine className="mb-3 h-3 w-28" />
        <SkeletonBlock className="mb-3 h-10 w-56 max-w-full" />
        <SkeletonLine className="mb-8 h-4 w-40" />
        <div className="ms-needs-you" aria-hidden>
          <SkeletonBlock className="h-[72px] w-full" />
          <SkeletonBlock className="h-[72px] w-full" />
          <SkeletonBlock className="h-[72px] w-full" />
        </div>
        <div className="ms-teacher-class-list" aria-hidden>
          <SkeletonBlock className="h-24 w-full" />
          <SkeletonBlock className="h-24 w-full" />
          <SkeletonBlock className="h-24 w-full" />
        </div>
      </div>
    </TeacherPageContainer>
  )
}
