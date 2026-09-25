import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'

/**
 * Fallback skeleton for any teacher route without its own loading.tsx: a page
 * head and three slips, the shape nearly every teacher page opens with. It
 * renders inside the layout's <main>, so it is a region, not another <main>.
 */
export default function TeacherLoading() {
  return (
    <TeacherPageContainer>
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading your teacher desk…</span>
        <SkeletonLine className="mb-3 h-3 w-28" />
        <SkeletonBlock className="mb-8 h-10 w-56 max-w-full" />
        <div className="ms-teacher-class-list" aria-hidden>
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
        </div>
      </div>
    </TeacherPageContainer>
  )
}
