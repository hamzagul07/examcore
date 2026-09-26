import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'

/** The roster's shape while it loads: class head, tabs, then roster rows. */
export default function ClassStudentsLoading() {
  return (
    <TeacherPageContainer>
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading the class roster…</span>
        <div aria-hidden>
          <SkeletonLine className="mb-3 h-3 w-24" />
          <SkeletonBlock className="mb-3 h-10 w-72 max-w-full" />
          <SkeletonLine className="mb-8 h-4 w-64 max-w-full" />
          <div className="ms-teacher-tabs">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonBlock key={i} className="mx-1 my-2 h-7 w-16 shrink-0" />
            ))}
          </div>
          <div className="ms-teacher-roster">
            <SkeletonLine className="mb-4 h-3 w-32" />
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonBlock key={i} className="h-14 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </TeacherPageContainer>
  )
}
