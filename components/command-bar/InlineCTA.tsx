'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { ChatCtaPayload } from '@/lib/chat-intents'

interface InlineCTAProps {
  cta: ChatCtaPayload
}

export function InlineCTA({ cta }: InlineCTAProps) {
  const isPrimary = cta.style !== 'secondary'

  if (isPrimary) {
    return (
      <Link href={cta.href} className="block">
        <motion.span
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group relative flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl ec-btn-send px-6 py-3.5 font-semibold"
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
        className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border px-6 py-3.5 font-semibold text-[var(--ec-text-primary)] transition-colors hover:bg-[var(--ec-surface-raised)]"
        style={{ borderColor: 'var(--ec-border)', background: 'var(--ec-surface)' }}
      >
        <span>{cta.text}</span>
      </motion.span>
    </Link>
  )
}
