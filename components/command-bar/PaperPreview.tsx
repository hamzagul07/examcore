'use client'

import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import { MathText } from '@/components/MathText'
import { InlineCTA } from './InlineCTA'
import type { ChatPaperPayload } from '@/lib/chat-intents'

interface PaperPreviewProps {
  paper: ChatPaperPayload
}

/**
 * Inline past-paper card rendered inside an assistant message bubble. The
 * question text is run through `MathText` so LaTeX like `$x^2$` and `$\frac{}{}$`
 * renders with KaTeX, matching the marking UI.
 */
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
      className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-dark-900/40 backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />

      <div className="relative p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-400" />
            <span className="font-mono text-xs uppercase tracking-wider text-emerald-400">
              {paper.subject_code} · {paper.session} · {paper.paper} · Q{paper.question_number}
            </span>
          </div>
          <span className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
            {paper.total_marks} marks
          </span>
        </div>

        <div className="mb-4 rounded-xl border border-white/5 bg-white/5 p-5 text-slate-100">
          <MathText text={paper.question_text} />
        </div>

        {paper.syllabus_tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {paper.syllabus_tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-400"
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
