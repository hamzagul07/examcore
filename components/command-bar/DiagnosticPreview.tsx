'use client'

import { motion } from 'framer-motion'
import { Brain } from 'lucide-react'
import { MathText } from '@/components/MathText'
import { InlineCTA } from './InlineCTA'
import type { ChatDiagnosticPayload } from '@/lib/chat-intents'

interface DiagnosticPreviewProps {
  diagnostic: ChatDiagnosticPayload
}

/**
 * Inline diagnostic challenge — a short topic-tagged question that pushes
 * the visitor toward signup with `?intent=diagnostic&topic=X` so the post-auth
 * flow can deep-link them straight into the marking page seeded with the
 * right topic.
 */
export function DiagnosticPreview({ diagnostic }: DiagnosticPreviewProps) {
  const uploadHref =
    '/auth/signup?intent=diagnostic&topic=' +
    encodeURIComponent(diagnostic.topic_code)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/40 to-dark-900/40 backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative p-6">
        <div className="mb-3 flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-400" />
          <span className="font-mono text-xs uppercase tracking-wider text-violet-400">
            Diagnostic · {diagnostic.topic_code} · {diagnostic.total_marks} marks
          </span>
        </div>

        <h4 className="mb-3 text-lg font-semibold text-white">
          {diagnostic.topic_name}
        </h4>

        <div className="mb-4 rounded-xl border border-white/5 bg-white/5 p-5 text-slate-100">
          <MathText text={diagnostic.question_text} />
        </div>

        <p className="mb-4 text-sm text-slate-400">
          Sketch your solution, snap a photo, and I&apos;ll show you exactly where
          you stand on this topic.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <InlineCTA
              cta={{
                text: 'Upload my attempt',
                href: uploadHref,
                style: 'primary',
              }}
            />
          </div>
          <div className="flex-1">
            <InlineCTA
              cta={{
                text: 'See model solution',
                href: '/auth/signup?intent=solution&topic=' + encodeURIComponent(diagnostic.topic_code),
                style: 'secondary',
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
