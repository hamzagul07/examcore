import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import { TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'

/**
 * A student's page while it loads: back link, head and tallies, tabs, then
 * set slips and history rows — the blocks the page renders, so nothing jumps
 * when it arrives.
 */
export default function StudentLoading() {
  return (
    <TeacherPageContainer className="max-w-5xl">
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading this student…</span>
        <div aria-hidden>
          <SkeletonLine className="mb-6 h-4 w-28" />
          <SkeletonLine className="mb-3 h-3 w-40" />
          <SkeletonBlock className="mb-3 h-10 w-64 max-w-full" />
          <SkeletonLine className="mb-6 h-4 w-56 max-w-full" />
          <div className="ms-teacher-tally mb-6">
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
          <div className="ms-teacher-tabs">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonBlock key={i} className="mx-1 my-2 h-7 w-16 shrink-0" />
            ))}
          </div>
          <SkeletonLine className="mb-3 h-3 w-16" />
          <div className="mb-8 flex flex-col gap-3">
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
          <SkeletonLine className="mb-3 h-3 w-28" />
          <div className="flex flex-col gap-2">
            <SkeletonBlock className="h-20 w-full" />
            <SkeletonBlock className="h-20 w-full" />
            <SkeletonBlock className="h-20 w-full" />
          </div>
        </div>
      </div>
    </TeacherPageContainer>
  )
}
