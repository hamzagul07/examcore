'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { ChatCtaPayload } from '@/lib/chat-intents'

interface InlineCTAProps {
  cta: ChatCtaPayload
}

/**
 * Glowing CTA used inside chat bubbles. Primary = emerald brand glow,
 * secondary = restrained glass pill. Wraps a Next.js Link so the router
 * handles client-side navigation.
 */
export function InlineCTA({ cta }: InlineCTAProps) {
  const isPrimary = cta.style !== 'secondary'

  if (isPrimary) {
    return (
      <Link href={cta.href} className="block">
        <motion.span
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-3.5 font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,0.4)] transition-shadow hover:shadow-[0_0_48px_rgba(16,185,129,0.6)]"
        >
          <span>{cta.text}</span>
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </motion.span>
      </Link>
    )
  }

  return (
    <Link href={cta.href} className="block">
      <motion.span
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-white transition-colors hover:bg-white/10"
      >
        <span>{cta.text}</span>
      </motion.span>
    </Link>
  )
}
