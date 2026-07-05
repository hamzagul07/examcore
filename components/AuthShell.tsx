'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { WordmarkLink } from '@/components/layout/Wordmark'

type Props = {
  children: React.ReactNode
  showBetaBadge?: boolean
  backLabel?: string
  backHref?: string
  /** Ask before following the back link (e.g. "Sign out?" mid-onboarding). */
  confirmBackMessage?: string
  /** Onboarding uses centered ob-shell without auth card chrome. */
  layout?: 'card' | 'onboarding'
}

/** Outer chrome for /auth/* and /onboarding — paper card on canvas. */
export function AuthShell({
  children,
  showBetaBadge = true,
  backLabel = 'Back to home',
  backHref = '/',
  confirmBackMessage,
  layout = 'card',
}: Props) {
  const handleBackClick = confirmBackMessage
    ? (e: React.MouseEvent) => {
        if (!window.confirm(confirmBackMessage)) e.preventDefault()
      }
    : undefined

  if (layout === 'onboarding') {
    return (
      <main className="ms-ob-shell">
        <div className="mb-8 flex justify-center sm:mb-10">
          <WordmarkLink />
        </div>
        {children}
        <p className="ms-micro" style={{ marginTop: 32 }}>
          <Link href={backHref} className="ec-btn-underline" onClick={handleBackClick}>
            {backLabel}
          </Link>
        </p>
      </main>
    )
  }

  return (
    <main className="ec-auth-shell relative flex min-h-screen min-h-dvh items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ y: -8 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <WordmarkLink />
          {showBetaBadge && (
            <div className="mt-5 flex justify-center">
              <span className="ec-label-tech">FREE TIER AVAILABLE</span>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ y: 14 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          className="ec-card relative overflow-hidden p-6 sm:p-10"
        >
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full ec-glow-orb blur-[80px] opacity-60"
            aria-hidden="true"
          />
          <div className="relative">{children}</div>
        </motion.div>

        <div className="mt-6 text-center">
          <Link
            href={backHref}
            onClick={handleBackClick}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 text-sm text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
          <p className="mt-2 text-xs text-[var(--ec-text-secondary)]">
            <Link href="/faq" className="ec-link inline-flex min-h-[44px] items-center px-1">
              FAQ
            </Link>
            {' · '}
            <Link href="/how-it-works" className="ec-link inline-flex min-h-[44px] items-center px-1">
              How it works
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
