import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A button label that can swap between several strings ("Copy share link" /
 * "Link copied" / "Try again" / "Retrying…") without the button changing width.
 *
 * Every label is laid out in the same grid cell; the inactive ones are kept
 * invisible so the cell is always as wide as the widest of them. Only the
 * active label is exposed to assistive tech.
 */
export function StableLabel({
  labels,
  active,
  className,
}: {
  labels: readonly ReactNode[]
  active: number
  className?: string
}) {
  return (
    <span className={cn('grid place-items-center', className)}>
      {labels.map((label, i) => (
        <span
          key={i}
          className={cn(
            'col-start-1 row-start-1 inline-flex items-center gap-2 whitespace-nowrap',
            i !== active && 'invisible'
          )}
          aria-hidden={i === active ? undefined : true}
        >
          {label}
        </span>
      ))}
    </span>
  )
}

/**
 * The idle/busy special case for a `Button isLoading`: the busy row is laid
 * out beneath the idle one so the button is as wide as the wider of the two
 * from the start. While idle, the hidden busy row also reserves the dots that
 * `Button` adds in its loading state; while busy, `Button` supplies the real
 * ones.
 */
export function BusyLabel({
  loading,
  idle,
  busy,
}: {
  loading: boolean
  idle: ReactNode
  busy: ReactNode
}) {
  return (
    <span className="inline-grid">
      <span
        className={cn(
          'col-start-1 row-start-1 inline-flex items-center justify-center gap-2',
          loading && 'invisible'
        )}
        aria-hidden={loading || undefined}
      >
        {idle}
      </span>
      <span
        className={cn(
          'col-start-1 row-start-1 inline-flex items-center justify-center gap-2.5',
          !loading && 'invisible'
        )}
        aria-hidden={!loading || undefined}
      >
        {!loading ? (
          <span className="ec-loading-dots [&>span]:animate-none" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        ) : null}
        <span>{busy}</span>
      </span>
    </span>
  )
}
