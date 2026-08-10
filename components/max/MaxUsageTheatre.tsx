import Link from 'next/link'
import { MaxBadge } from '@/components/max/MaxBadge'
import { TIER_MONTHLY_CAPS } from '@/lib/billing/caps'

/**
 * Makes Max volume feel like a win: "Scholar would have capped; you still have headroom."
 */
export function MaxUsageTheatre({
  used,
  remaining,
  cap,
}: {
  used: number
  remaining: number
  cap: number
}) {
  const scholarCap = TIER_MONTHLY_CAPS.scholar
  const pastScholar = used > scholarCap

  return (
    <div className="ec-card ec-card--paper space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MaxBadge label="Max · headroom" />
        <Link href="/dashboard/vault" className="ec-link text-sm font-semibold">
          Open Resource Vault →
        </Link>
      </div>
      <p className="text-body m-0 text-[var(--ec-text-secondary)]">
        You&apos;ve marked <strong className="text-[var(--ec-text-primary)]">{used}</strong> this
        month
        {pastScholar ? (
          <>
            {' '}
            — Scholar would have capped at {scholarCap}; you still have{' '}
            <strong className="text-[var(--ec-text-primary)]">{remaining}</strong> of {cap} left.
          </>
        ) : (
          <>
            {' '}
            of {cap}. Scholar caps at {scholarCap}; Max keeps marking when exam season gets loud.
          </>
        )}
      </p>
    </div>
  )
}
