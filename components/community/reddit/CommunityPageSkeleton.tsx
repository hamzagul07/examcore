import { ExamLoader } from '@/components/ui/ExamLoader'
import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

export function CommunityPageSkeleton() {
  return (
    <div className="rc-page rc-page--hub" aria-busy="true" aria-label="Loading Exam Room">
      <div className="ec-page-loading ec-page-loading--compact rc-community-loading-intro">
        <ExamLoader size="md" rotateHints />
      </div>
      <div className="rc-layout rc-layout--hub">
        <main className="rc-main">
          <SkeletonBlock className="mb-3 h-11 w-full rounded-full" />
          <SkeletonBlock className="mb-3 h-12 w-full rounded-xl" />
          <SkeletonBlock className="mb-3 h-10 w-full max-w-md rounded-xl" />
          <SkeletonBlock className="mb-4 h-10 w-full max-w-sm rounded-xl" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[40px_1fr] gap-3">
                <SkeletonBlock className="h-24 rounded-xl" />
                <div className="flex flex-col gap-2 py-1">
                  <SkeletonLine className="h-3 w-24" />
                  <SkeletonLine className="h-5 w-full max-w-md" />
                  <SkeletonLine className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
