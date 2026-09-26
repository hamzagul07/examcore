import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'

/** Class settings while it loads: the class head and tabs every class page has, then the setting sections. */
export default function ClassroomSettingsLoading() {
  return (
    <TeacherPageContainer>
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading class settings…</span>
        <div aria-hidden>
          <SkeletonLine className="mb-3 h-3 w-24" />
          <SkeletonBlock className="mb-3 h-10 w-72 max-w-full" />
          <SkeletonLine className="mb-8 h-4 w-64 max-w-full" />
          <div className="ms-teacher-tabs">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonBlock key={i} className="mx-1 my-2 h-7 w-16 shrink-0" />
            ))}
          </div>
        </div>
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
