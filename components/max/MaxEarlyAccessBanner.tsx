import { MaxBadge } from '@/components/max/MaxBadge'
import { maxEarlyAccessFeature } from '@/lib/max/early-access'

/**
 * Only renders when a real experimental feature string is configured.
 * Prevents advertising empty "early access."
 */
export function MaxEarlyAccessBanner() {
  const feature = maxEarlyAccessFeature()
  if (!feature) return null

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 border border-[var(--ec-border)] px-4 py-3">
      <MaxBadge label="Max · early access" />
      <p className="text-body m-0 text-[var(--ec-text-secondary)]">
        You&apos;re on Max early access:{' '}
        <strong className="text-[var(--ec-text-primary)]">{feature}</strong>
      </p>
    </div>
  )
}
