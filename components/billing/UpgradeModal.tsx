'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { capForTier, omniCapForTier } from '@/lib/billing/caps'
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
}

function capCopy(
  variant: UpgradeModalProps['variant'],
  tier: SubscriptionTier | undefined,
  cap: number | null | undefined
): string {
  if (variant === 'omni_cap') {
    const omniCap = cap ?? (tier ? omniCapForTier(tier) : omniCapForTier('free'))
    if (tier === 'free') {
      return `You've used all ${omniCap} of your free Omni messages this month`
    }
    return `You've used all ${omniCap} of your Omni messages this month`
  }
  const questionCap = tier ? capForTier(tier) : cap ?? capForTier('free')
  if (tier === 'free') {
    return `You've used all ${questionCap} of your free questions this month`
  }
  const label = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Your'
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
}: UpgradeModalProps) {
  const isAnon = variant === 'anonymous'
  const title = isAnon ? 'Sign up to keep marking' : capCopy(variant, tier, cap)
  const resetDate = periodResetsAt
    ? new Date(periodResetsAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border ec-tint-success-icon">
        <Sparkles className="h-6 w-6 ec-text-brand" />
      </div>

      <h2 className="text-headline text-[var(--ec-text-primary)]">{title}</h2>
      <p className="text-body mt-2 text-[var(--ec-text-secondary)]">
        {isAnon
          ? `Create a free account to keep marking — ${capForTier('free')} free questions and ${omniCapForTier('free')} Omni messages every month, no card required.`
          : variant === 'omni_cap'
            ? 'Upgrade to keep chatting with Omni about your work, or top up credits.'
            : 'Upgrade or grab a credit top-up to keep marking now.'}
      </p>

      {!isAnon && creditBalance > 0 && (
        <p className="mt-2 text-sm ec-score-high">
          You have {creditBalance} credit{creditBalance === 1 ? '' : 's'} — your next{' '}
          {variant === 'omni_cap' ? 'Omni message' : 'question'} will use one.
        </p>
      )}
      {!isAnon && resetDate && (
        <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">
          Your {variant === 'omni_cap' ? 'Omni messages' : 'questions'} reset on {resetDate}.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {isAnon ? (
          <Link href="/auth/signup" className="ec-btn-primary w-full justify-center">
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
