'use client'

import Link from 'next/link'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

interface HeroCTAsProps {
  primary: { label: string; href: string }
  secondary: { label: string; targetId: string }
}

const ctaBase =
  'inline-flex min-h-[44px] items-center justify-center px-6 py-3.5 text-[15px] font-medium tracking-[-0.005em]'

export function HeroCTAs({ primary, secondary }: HeroCTAsProps) {
  const prefersReducedMotion = useReducedMotion()

  const wrapperVariants: Variants = prefersReducedMotion
    ? {}
    : { hover: { scale: 1.03 }, tap: { scale: 0.98 } }
  const arrowVariants: Variants = prefersReducedMotion ? {} : { hover: { x: 3 } }

  function handleSecondaryClick() {
    const el = document.getElementById(secondary.targetId)
    el?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <motion.div
        className="inline-flex"
        whileHover="hover"
        whileTap="tap"
        variants={wrapperVariants}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      >
        <Link
          href={primary.href}
          className={`${ctaBase} gap-2 rounded-[var(--ec-radius-button)] bg-[var(--ec-text-primary)] text-[var(--ec-surface)]`}
        >
          {primary.label}
          <motion.span className="inline-flex" variants={arrowVariants}>
            <ArrowRight size={16} aria-hidden />
          </motion.span>
        </Link>
      </motion.div>

      <button
        type="button"
        onClick={handleSecondaryClick}
        aria-controls={secondary.targetId}
        className={`${ctaBase} text-[var(--ec-text-secondary)] transition-colors duration-200 hover:text-[var(--ec-text-primary)]`}
      >
        {secondary.label}
      </button>
    </div>
  )
}
