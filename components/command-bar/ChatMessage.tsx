'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { PaperPreview } from './PaperPreview'
import { DiagnosticPreview } from './DiagnosticPreview'
import { InlineUpload } from './InlineUpload'
import { InlineCTA } from './InlineCTA'
import type { ChatAction } from '@/lib/chat-intents'

export interface ChatMessageData {
  id: string
  role: 'user' | 'assistant'
  content: string
  action?: ChatAction
}

interface ChatMessageProps {
  message: ChatMessageData
}

/**
 * Renders a single chat bubble. Assistant messages can be followed by one of
 * four inline action surfaces (paper preview, diagnostic, upload zone, CTA)
 * depending on `message.action.type`.
 */
export function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] rounded-2xl rounded-br-md border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 px-4 py-3 text-white">
          {message.content}
        </div>
      </motion.div>
    )
  }

  const action = message.action

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500">
        <Sparkles className="h-5 w-5 text-white" />
      </div>

      <div className="flex-1 space-y-3 min-w-0">
        {message.content && (
          <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-4 py-3 text-slate-200">
            {message.content}
          </div>
        )}

        {action?.type === 'render_paper' && action.paper && (
          <PaperPreview paper={action.paper} />
        )}

        {action?.type === 'render_diagnostic' && action.diagnostic && (
          <DiagnosticPreview diagnostic={action.diagnostic} />
        )}

        {action?.type === 'render_upload' && <InlineUpload />}

        {action?.type === 'render_cta' && action.cta && (
          <InlineCTA cta={action.cta} />
        )}

        {action?.type === 'render_signup' && (
          <InlineCTA
            cta={{
              text: 'Sign up free',
              href: '/auth/signup',
              style: 'primary',
            }}
          />
        )}
      </div>
    </motion.div>
  )
}
