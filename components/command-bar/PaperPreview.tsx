'use client'

import { motion } from 'framer-motion'
import { MathText } from '@/components/MathText'
import { InlineCTA } from './InlineCTA'
import type { ChatPaperPayload } from '@/lib/chat-intents'

interface PaperPreviewProps {
  paper: ChatPaperPayload
}

export function PaperPreview({ paper }: PaperPreviewProps) {
  const ctaHref =
    '/auth/signup?intent=mark&paper=' +
    encodeURIComponent(
      `${paper.subject_code}/${paper.session}/${paper.paper}/Q${paper.question_number}`
    )

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="ec-card ec-card--paper relative overflow-hidden border-[color-mix(in_srgb,var(--ec-brand)_20%,transparent)]"
    >
      <div className="relative p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-grid h-5 min-w-5 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-1 font-mono text-[9px] font-bold text-[var(--ec-brand)]"
              aria-hidden
            >
              Q
            </span>
            <span className="font-mono text-xs uppercase tracking-wider ec-text-brand">
              {paper.subject_code} · {paper.session} · {paper.paper} · Q
              {paper.question_number}
            </span>
          </div>
          <span className="ec-tint-success-chip rounded-md px-2 py-1 text-xs font-semibold">
            {paper.total_marks} marks
          </span>
        </div>

        <div
          className="ec-card ec-card--paper mb-4 border ec-border-color ec-bg-surface-raised ec-text-primary p-4 sm:p-5"
        >
          <MathText text={paper.question_text} />
        </div>

        {paper.syllabus_tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {paper.syllabus_tags.map((tag) => (
              <span
                key={tag}
                className="rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-[var(--ec-text-secondary)]"
                style={{
                  borderColor: 'var(--ec-border)',
                  background: 'var(--ec-surface-raised)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <InlineCTA
          cta={{
            text: 'Solve & get marked instantly',
            href: ctaHref,
            style: 'primary',
          }}
        />
      </div>
    </motion.div>
  )
}
