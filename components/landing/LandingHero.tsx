'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { LandingInlineChat } from '@/components/landing/LandingInlineChat'
import { LandingHeroEntry, LandingMockupHero } from '@/app/(marketing)/page.client'

interface LandingHeroProps {
  markHref: string
}

export function LandingHero({ markHref }: LandingHeroProps) {
  const [chatActive, setChatActive] = useState(false)

  return (
    <LandingHeroEntry>
      <div className="relative mx-auto max-w-7xl text-center">
        <div className="mb-8 flex justify-center">
          <span className="ec-label-tech">Early access · Free · A-Level & O-Level</span>
        </div>

        {/* Headline + sub — collapse when chat is active */}
        <AnimatePresence initial={false}>
          {!chatActive && (
            <motion.div
              key="headline"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ overflow: 'hidden' }}
            >
              <h1 className="text-display mb-6 text-[var(--ec-text-primary)]">
                <span className="gradient-text">Your past papers,</span>
                <br />
                <span className="ec-text-gradient brand-breathe">
                  marked like the exam
                </span>
              </h1>

              <p className="landing-lead mx-auto mb-12 max-w-2xl">
                Snap your working, pick the paper, get examiner-style feedback —
                MCQ keys, B1/M1/A1, or essay bands from the real Cambridge scheme.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inline chat — always present, left-aligned */}
        <div className="mb-10">
          <div className="mx-auto w-full max-w-2xl text-left">
            <LandingInlineChat onActiveChange={setChatActive} />
          </div>
        </div>

        {/* CTA buttons — fade out when chat is active */}
        <AnimatePresence initial={false}>
          {!chatActive && (
            <motion.div
              key="ctas"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href={markHref}
                  className="ec-btn-primary w-full min-h-[52px] text-base sm:w-auto"
                  style={{ padding: '16px 32px' }}
                >
                  Mark your first question <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="ec-btn-secondary w-full min-h-[52px] text-base sm:w-auto"
                  style={{ padding: '16px 32px' }}
                >
                  See how it works
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mockup — fade out when chat is active */}
      <AnimatePresence initial={false}>
        {!chatActive && (
          <motion.div
            key="mockup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative mx-auto mt-16 max-w-4xl sm:mt-20"
          >
            <div className="pointer-events-none absolute -inset-x-16 inset-y-0 -z-10">
              <div className="absolute left-1/4 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-emerald-500/20 blur-[120px]" />
              <div className="absolute right-1/4 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-violet-500/20 blur-[120px]" />
            </div>
            <LandingMockupHero />
          </motion.div>
        )}
      </AnimatePresence>
    </LandingHeroEntry>
  )
}
