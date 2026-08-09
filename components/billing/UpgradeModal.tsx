'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { buildSignUpHref } from '@/lib/auth-redirect'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
import { capForTier, omniCapForTier, tierMarketingName } from '@/lib/billing/caps'
import { Sheet } from '@/components/ui/Sheet'
import type { SubscriptionTier } from '@/lib/database.types'

export type UpgradeModalProps = {
  open: boolean
  onClose: () => void
  variant: 'anonymous' | 'cap' | 'omni_cap'
  tier?: SubscriptionTier
  cap?: number | null
  periodResetsAt?: string | null
  creditBalance?: number
  /** Post-signup destination for the anonymous variant (e.g. /mark). */
  returnPath?: string
}

function capCopy(
  variant: UpgradeModalProps['variant'],
  tier: SubscriptionTier | undefined,
  cap: number | null | undefined
): string {
  if (variant === 'omni_cap') {
    const omniCap = cap ?? (tier ? omniCapForTier(tier) : omniCapForTier('free'))
    if (tier === 'free') {
      return `You've used all ${omniCap} of your free study chat messages this month`
    }
    return `You've used all ${omniCap} of your study chat messages this month`
  }
  // An explicitly reported cap still wins over one reconstructed from the tier:
  // the server knows what it actually enforced, and a number quoted back to a
  // student who has just been blocked has to be the one they hit.
  const questionCap = cap ?? (tier ? capForTier(tier) : capForTier('free'))
  if (tier === 'free') {
    return `You've used all ${questionCap} of your free questions this month`
  }
  const label = tier ? tierMarketingName(tier) : 'Your'
  return `You've used all ${questionCap} of your ${label} questions this month`
}

export function UpgradeModal({
  open,
  onClose,
  variant,
  tier,
  cap,
  periodResetsAt,
  creditBalance = 0,
  returnPath = '/mark',
}: UpgradeModalProps) {
  useEffect(() => {
    if (!open) return
    trackFunnelEvent('upgrade_viewed', {
      source: variant,
      subject: tier ?? null,
    })
    if (variant === 'anonymous') {
      trackFunnelEvent('signup_started', { source: 'upgrade_modal_anonymous' })
    }
  }, [open, variant, tier])

  const isAnon = variant === 'anonymous'
  const title = isAnon ? 'Sign up to keep marking' : capCopy(variant, tier, cap)
  const resetDate = periodResetsAt
    ? new Date(periodResetsAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <Sheet open={open} onClose={onClose} title={title} className="ms-upgrade-sheet">
      <span className="ec-ink-stamp ec-ink-stamp--hero mb-4" aria-hidden>
        {isAnon ? '@' : 'M1'}
      </span>

      <h2 className="text-headline text-[var(--ec-text-primary)]">{title}</h2>
      <p className="text-body mt-2 text-[var(--ec-text-secondary)]">
        {isAnon
          ? `Create a free account to keep marking — ${capForTier('free')} free questions and ${omniCapForTier('free')} study chat messages every month, no card required.`
          : variant === 'omni_cap'
            ? 'Upgrade to keep using Ask MarkScheme about your work, or top up credits.'
            : 'Upgrade or grab a credit top-up to keep marking now.'}
      </p>

      {!isAnon && creditBalance > 0 && (
        <p className="mt-2 text-sm ec-score-high">
          You have {creditBalance} credit{creditBalance === 1 ? '' : 's'} — your next{' '}
          {variant === 'omni_cap' ? 'study chat message' : 'question'} will use one.
        </p>
      )}
      {!isAnon && resetDate && (
        <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">
          Your {variant === 'omni_cap' ? 'study chat messages' : 'questions'} reset on {resetDate}.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {isAnon ? (
          <Link
            href={buildSignUpHref(returnPath.startsWith('/') ? returnPath : null)}
            className="ec-btn-primary w-full justify-center"
          >
            Sign up to keep marking
          </Link>
        ) : (
          <>
            <Link href="/pricing" className="ec-btn-primary w-full justify-center">
              See plans
            </Link>
            <Link href="/pricing#credits" className="ec-btn-secondary w-full justify-center">
              Top up credits
            </Link>
          </>
        )}
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] py-2 text-sm font-medium text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)]"
        >
          Not now
        </button>
      </div>
    </Sheet>
  )
}
