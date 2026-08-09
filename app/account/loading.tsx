import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

/** Matches SettingsShell geometry (ST-01). */
export default function AccountLoading() {
  return (
    <main className="app-shell app-shell-tabbed ms-settings-shell md:py-10 lg:py-14" aria-busy="true">
      <span className="sr-only" role="status">
        Loading account settings
      </span>
      <div className="mx-auto min-w-0 w-full max-w-5xl">
        <SkeletonLine className="mb-3 h-3 w-20" />
        <SkeletonBlock className="mb-3 h-10 w-56" />
        <SkeletonLine className="mb-8 h-4 w-80 max-w-full" />
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <div className="hidden shrink-0 space-y-1 lg:block lg:w-[220px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-11 w-full" />
            ))}
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <SkeletonBlock className="h-64 w-full" />
            <SkeletonBlock className="h-40 w-full" />
          </div>
        </div>
      </div>
    </main>
  )
}
