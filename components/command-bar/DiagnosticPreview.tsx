'use client'

import { motion } from 'framer-motion'
import { Brain } from 'lucide-react'
import { MathText } from '@/components/MathText'
import { InlineCTA } from './InlineCTA'
import type { ChatDiagnosticPayload } from '@/lib/chat-intents'

interface DiagnosticPreviewProps {
  diagnostic: ChatDiagnosticPayload
}

export function DiagnosticPreview({ diagnostic }: DiagnosticPreviewProps) {
  const uploadHref =
    '/auth/signup?intent=diagnostic&topic=' +
    encodeURIComponent(diagnostic.topic_code)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="ec-card relative overflow-hidden border-[color-mix(in_srgb,var(--ec-chip-accent-text)_20%,transparent)]"
    >
      <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full ec-glow-orb blur-3xl opacity-50" />

      <div className="relative p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <Brain className="h-4 w-4 text-[var(--ec-chip-accent-text)]" />
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--ec-chip-accent-text)]">
            Diagnostic · {diagnostic.topic_code} · {diagnostic.total_marks} marks
          </span>
        </div>

        <h4 className="mb-3 text-lg font-semibold text-[var(--ec-text-primary)]">
          {diagnostic.topic_name}
        </h4>

        <div
          className="mb-4 rounded-xl border p-4 sm:p-5"
          style={{
            borderColor: 'var(--ec-border)',
            background: 'var(--ec-surface-raised)',
            color: 'var(--ec-text-primary)',
          }}
        >
          <MathText text={diagnostic.question_text} />
        </div>

        <p className="mb-4 text-sm text-[var(--ec-text-secondary)]">
          Sketch your solution, snap a photo, and I&apos;ll show you exactly where
          you stand on this topic.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1">
            <InlineCTA
              cta={{
                text: 'Upload my attempt',
                href: uploadHref,
                style: 'primary',
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <InlineCTA
              cta={{
                text: 'See model solution',
                href:
                  '/auth/signup?intent=solution&topic=' +
                  encodeURIComponent(diagnostic.topic_code),
                style: 'secondary',
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
