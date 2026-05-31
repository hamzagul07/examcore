'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type { SubscriptionTier } from '@/lib/database.types'

export type UpgradeModalProps = {
  open: boolean
  onClose: () => void
  /** 'anonymous' = signed-out user hit a limit; 'cap' = signed-in user at cap. */
  variant: 'anonymous' | 'cap'
  tier?: SubscriptionTier
  cap?: number | null
  periodResetsAt?: string | null
  creditBalance?: number
}

function capCopy(tier: SubscriptionTier | undefined, cap: number | null | undefined): string {
  if (tier === 'student') return `You've used all ${cap ?? 100} of your Student marks this month`
  return `You've used all ${cap ?? 5} of your free marks this month`
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
  const title = isAnon ? 'Sign up to keep marking' : capCopy(tier, cap)
  const resetDate = periodResetsAt
    ? new Date(periodResetsAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            className="ec-card relative z-10 w-full max-w-md p-7 sm:p-8"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
              <Sparkles className="h-6 w-6 text-emerald-400" />
            </div>

            <h2 className="text-headline text-[var(--ec-text-primary)]">{title}</h2>
            <p className="text-body mt-2 text-[var(--ec-text-secondary)]">
              {isAnon
                ? 'Create a free account to keep marking — 5 free marks every month, no card required.'
                : 'Upgrade or grab a credit top-up to keep marking now.'}
            </p>

            {!isAnon && creditBalance > 0 && (
              <p className="mt-2 text-sm text-emerald-400">
                You have {creditBalance} credit{creditBalance === 1 ? '' : 's'} — your next mark will
                use one.
              </p>
            )}
            {!isAnon && resetDate && (
              <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">
                Your marks reset on {resetDate}.
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
                  <Link
                    href="/pricing#credits"
                    className="ec-btn-secondary w-full justify-center"
                  >
                    Top up credits
                  </Link>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="mt-1 text-sm font-medium text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)]"
              >
                Not now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
