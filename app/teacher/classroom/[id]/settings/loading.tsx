import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'

/** Class settings while it loads: head, then the stack of setting sections. */
export default function ClassroomSettingsLoading() {
  return (
    <TeacherPageContainer>
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading class settings…</span>
        <SkeletonLine className="mb-6 h-4 w-32" />
        <SkeletonLine className="mb-3 h-3 w-28" />
        <SkeletonBlock className="mb-8 h-10 w-72 max-w-full" />
        <div className="ms-teacher-settings" aria-hidden>
          <SkeletonBlock className="h-16 w-full" />
          <SkeletonBlock className="h-72 w-full" />
          <SkeletonBlock className="h-40 w-full" />
          <SkeletonBlock className="h-56 w-full" />
        </div>
      </div>
    </TeacherPageContainer>
  )
}
