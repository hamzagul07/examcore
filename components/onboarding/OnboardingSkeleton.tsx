import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

/**
 * Shared onboarding loading geometry (ST-01) — route + Suspense use the same
 * shell. It mirrors the first-run screen top to bottom — wordmark, progress
 * line, then the paper docket with its eyebrow, heading, lead, the two choice
 * grids, the subject heading, filing rows and the nav — using the same shell
 * classes, so the real step replaces it in place instead of reflowing.
 */
export function OnboardingSkeleton() {
  return (
    <div className="ms-ob-shell" aria-busy="true">
      <span className="sr-only" role="status">
        Loading setup
      </span>

      {/* Wordmark row (AuthShell, onboarding layout) */}
      <div className="mb-8 flex justify-center sm:mb-10">
        <SkeletonBlock className="h-7 w-36" />
      </div>

      {/* Progress line */}
      <div className="ms-ob-progress flex justify-center">
        <SkeletonLine className="mb-2.5 h-4 w-44" />
      </div>

      <div className="ms-ob-step ms-ob-docket text-left">
        {/* Eyebrow + stamp */}
        <div className="mb-2 flex items-center gap-2">
          <SkeletonLine className="h-3 w-24" />
          <SkeletonBlock className="h-[22px] w-7" />
        </div>
        {/* Heading */}
        <SkeletonBlock className="h-9 w-4/5 sm:h-10" />
        {/* Lead + note */}
        <SkeletonLine className="mt-3 h-4 w-full" />
        <SkeletonLine className="mt-2 h-4 w-11/12" />
        <SkeletonLine className="mt-2.5 h-3 w-2/5" />

        {/* Exam board */}
        <SkeletonLine className="mt-7 h-3 w-20" />
        <div className="ms-ob-choices">
          <SkeletonBlock className="h-[88px] w-full" />
          <SkeletonBlock className="h-[88px] w-full" />
        </div>

        {/* Level */}
        <SkeletonLine className="mt-7 h-3 w-28" />
        <div className="ms-ob-choices">
          <SkeletonBlock className="h-16 w-full" />
          <SkeletonBlock className="h-16 w-full" />
        </div>

        {/* Subjects heading + lead */}
        <SkeletonBlock className="mt-10 h-7 w-2/3" />
        <SkeletonLine className="mt-2.5 h-4 w-1/2" />

        {/* Group overline + filing rows */}
        <SkeletonLine className="mt-6 h-3 w-24" />
        <div className="mt-3 space-y-1.5">
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
        </div>

        {/* Nav */}
        <div className="ms-ob-nav">
          <span />
          <SkeletonBlock className="h-11 w-full sm:w-44" />
        </div>
      </div>
    </div>
  )
}
