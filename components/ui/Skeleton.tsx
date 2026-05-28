import { cn } from '@/lib/utils'

type SkeletonProps = {
  className?: string
  /** When true, renders a circular skeleton (avatars / icon plates). */
  circle?: boolean
}

/**
 * Shimmer-loading placeholder.
 *
 * A muted slate block with a white gradient sweeping left-to-right.
 * Pair with explicit width/height utility classes from the caller so
 * the layout doesn't reflow when the real content loads in.
 *
 * Example:
 *   <Skeleton className="h-6 w-32" />
 *   <Skeleton className="h-12 w-12" circle />
 */
export function Skeleton({ className, circle = false }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden border border-white/5 bg-dark-800/60',
        circle ? 'rounded-full' : 'rounded-xl',
        className
      )}
    >
      <div className="animate-shimmer-skeleton absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  )
}
