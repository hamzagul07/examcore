import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'

/** The class list's shape while it loads: head and a column of class slips. */
export default function TeacherClassroomsLoading() {
  return (
    <TeacherPageContainer>
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading your classes…</span>
        <SkeletonLine className="mb-3 h-3 w-24" />
        <SkeletonBlock className="mb-3 h-10 w-64 max-w-full" />
        <SkeletonLine className="mb-8 h-4 w-80 max-w-full" />
        <div className="ms-teacher-class-list" aria-hidden>
          <SkeletonBlock className="h-24 w-full" />
          <SkeletonBlock className="h-24 w-full" />
          <SkeletonBlock className="h-24 w-full" />
          <SkeletonBlock className="h-24 w-full" />
        </div>
      </div>
    </TeacherPageContainer>
  )
}
