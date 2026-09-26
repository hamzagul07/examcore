'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

import type { ChatCtaPayload } from '@/lib/chat-intents'
import { isSafeRelativeHref } from '@/lib/omni-ai/actions'

interface InlineCTAProps {
  cta: ChatCtaPayload
}

export function InlineCTA({ cta }: InlineCTAProps) {
  // Last line of defence for the CTA href: the server already drops a
  // directive with a non-relative href (lib/omni-ai/actions.ts), but this
  // component is also fed by the command bar's own previews and by any
  // future action source, and the failure mode — a model-written link to an
  // external domain rendered as a first-party button — is phishing. Only a
  // same-origin path ever becomes a link here.
  if (!isSafeRelativeHref(cta.href)) return null

  const isPrimary = cta.style !== 'secondary'

  if (isPrimary) {
    return (
      <Link href={cta.href} className="block">
        <motion.span
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group relative flex w-full min-h-[44px] items-center justify-center gap-2 rounded ec-btn-send px-6 py-3.5 font-semibold"
        >
          <span>{cta.text}</span>
          <span className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden>→</span>
        </motion.span>
      </Link>
    )
  }

  return (
    <Link href={cta.href} className="block">
      <motion.span
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded border px-6 py-3.5 font-semibold text-[var(--ec-text-primary)] transition-colors hover:bg-[var(--ec-surface-raised)]"
        style={{ borderColor: 'var(--ec-border)', background: 'var(--ec-surface)' }}
      >
        <span>{cta.text}</span>
      </motion.span>
    </Link>
  )
}
