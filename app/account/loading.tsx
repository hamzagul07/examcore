import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

export default function AccountLoading() {
  return (
    <main className="app-shell app-shell-tabbed md:py-10 lg:py-14">
      <div className="mx-auto min-w-0 w-full max-w-5xl">
        <SkeletonLine className="mb-3 h-3 w-20" />
        <SkeletonBlock className="mb-8 h-10 w-48" />
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <div className="hidden space-y-2 lg:block">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
          <SkeletonBlock className="h-80 w-full" />
        </div>
      </div>
    </main>
  )
}
