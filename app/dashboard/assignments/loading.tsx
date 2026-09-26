import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

/** Matches the sets list: back link, header, then set slips. */
export default function StudentAssignmentsLoading() {
  return (
    <main className="app-shell app-shell-tabbed" aria-busy="true">
      <span className="sr-only" role="status">
        Loading your sets
      </span>
      <div className="mx-auto w-full min-w-0 max-w-3xl pb-10">
        <SkeletonBlock className="mb-8 h-11 w-44" />
        <SkeletonLine className="mb-3 h-3 w-32" />
        <SkeletonBlock className="mb-3 h-10 w-48" />
        <SkeletonLine className="mb-8 h-4 w-80 max-w-full" />
        <SkeletonLine className="mb-4 h-5 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBlock key={i} className="mb-3 h-24 w-full" />
        ))}
      </div>
    </main>
  )
}
