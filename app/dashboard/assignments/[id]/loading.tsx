import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

/** Matches the set page: back link, header, notice, then the exam sheet rows. */
export default function StudentSetLoading() {
  return (
    <main className="app-shell app-shell-tabbed" aria-busy="true">
      <span className="sr-only" role="status">
        Loading the set
      </span>
      <div className="mx-auto w-full min-w-0 max-w-3xl pb-10">
        <SkeletonBlock className="mb-8 h-11 w-32" />
        <SkeletonLine className="mb-3 h-3 w-40" />
        <SkeletonBlock className="mb-4 h-10 w-72 max-w-full" />
        <SkeletonLine className="mb-2 h-4 w-56" />
        <SkeletonLine className="mb-6 h-4 w-64 max-w-full" />
        <SkeletonBlock className="mb-6 h-12 w-full" />
        <div className="ec-exam-sheet">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="mb-3 h-16 w-full" />
          ))}
        </div>
      </div>
    </main>
  )
}
