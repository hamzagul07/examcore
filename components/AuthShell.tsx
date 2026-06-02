'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'

type Props = {
  children: React.ReactNode
  showBetaBadge?: boolean
  backLabel?: string
  backHref?: string
}

/**
 * Outer chrome for /auth/* and /onboarding.
 *
 * Sprint 20: gradient brand logo on top, dark glass card with emerald +
 * violet ambient glow, monospace beta chip with glowing dot.
 */
export function AuthShell({
  children,
  showBetaBadge = true,
  backLabel = 'Back to home',
  backHref = '/',
}: Props) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <Link
            href="/"
            className="inline-flex items-center text-3xl font-extrabold tracking-tight ec-text-gradient"
          >
            MarkScheme
          </Link>
          {showBetaBadge && (
            <div className="mt-5 flex justify-center">
              <span className="ec-label-tech">FREE TIER AVAILABLE</span>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          className="ec-card relative overflow-hidden p-7 sm:p-10"
        >
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full ec-glow-orb-lg blur-[100px]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full ec-glow-orb-accent blur-[100px]"
            aria-hidden="true"
          />
          <div className="relative">{children}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mt-6 text-center"
        >
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        </motion.div>
      </div>
    </main>
  )
}
