import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'

/**
 * Lightweight placeholder for static marketing routes during client-side
 * navigation (shown by route-level loading.tsx). Neutral hero + prose shape so
 * it reads well for both prose pages (about/faq) and content hubs (blog/guides).
 */
export function MarketingRouteSkeleton() {
  return (
    <div className="ms-pg py-12 sm:py-16" role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      <div className="mx-auto max-w-2xl">
        <SkeletonLine className="h-4 w-28" />
        <SkeletonLine className="mt-5 h-9 w-3/4" />
        <SkeletonLine className="mt-3 h-9 w-1/2" />
        <SkeletonLine className="mt-7 h-4 w-full" />
        <SkeletonLine className="mt-2.5 h-4 w-full" />
        <SkeletonLine className="mt-2.5 h-4 w-5/6" />
        <SkeletonBlock className="mt-8 h-32 w-full" />
        <SkeletonLine className="mt-7 h-4 w-full" />
        <SkeletonLine className="mt-2.5 h-4 w-4/6" />
      </div>
    </div>
  )
}
