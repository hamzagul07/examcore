import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'

/** The Gaps tab while it loads: class head, tabs, set filter, tallies, topic bars and the report. */
export default function ClassGapsLoading() {
  return (
    <TeacherPageContainer>
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading the gap report…</span>
        <div aria-hidden>
          <SkeletonLine className="mb-3 h-3 w-24" />
          <SkeletonBlock className="mb-3 h-10 w-72 max-w-full" />
          <SkeletonLine className="mb-8 h-4 w-64 max-w-full" />
          <div className="ms-teacher-tabs">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonBlock key={i} className="mx-1 my-2 h-7 w-16 shrink-0" />
            ))}
          </div>
          <SkeletonBlock className="mb-6 h-16 w-full" />
          <div className="ms-teacher-tally mb-8">
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
          <SkeletonBlock className="mb-8 h-72 w-full" />
          <SkeletonBlock className="mb-8 h-56 w-full" />
        </div>
      </div>
    </TeacherPageContainer>
  )
}
