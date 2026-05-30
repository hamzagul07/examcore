'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import type { OmniAIMessage, OmniAIAction } from '@/lib/omni-ai/types'
import { PaperPreview } from '@/components/command-bar/PaperPreview'
import { DiagnosticPreview } from '@/components/command-bar/DiagnosticPreview'
import { InlineUpload } from '@/components/command-bar/InlineUpload'
import { InlineCTA } from '@/components/command-bar/InlineCTA'
import { SplitScreenPreview } from './SplitScreenPreview'

interface StreamingMessageProps {
  message: OmniAIMessage
  splitPaper?: boolean
}

export function StreamingMessage({ message, splitPaper = false }: StreamingMessageProps) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] rounded-2xl rounded-br-md border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 px-4 py-2.5 text-white">
          {message.content}
        </div>
      </motion.div>
    )
  }

  const showSplitPaper =
    splitPaper &&
    !message.isStreaming &&
    message.action?.type === 'render_paper' &&
    message.action.paper

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500">
        <Sparkles className="h-4 w-4 text-white" />
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        {!showSplitPaper && (
          <div className="prose prose-invert prose-sm max-w-none rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-4 py-3">
            <RichTextRenderer text={message.content} />
            {message.isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-emerald-400" />
            )}
          </div>
        )}

        {showSplitPaper && message.action?.paper && (
          <>
            <div className="prose prose-invert prose-sm max-w-none rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-4 py-3 hidden lg:block">
              <RichTextRenderer text={message.content} />
            </div>
            <SplitScreenPreview
              paper={message.action.paper}
              messageContent={message.content}
            />
          </>
        )}

        {!message.isStreaming && message.action && !showSplitPaper && (
          <ActionRenderer action={message.action} />
        )}
      </div>
    </motion.div>
  )
}

function ActionRenderer({ action }: { action: OmniAIAction }) {
  switch (action.type) {
    case 'render_paper':
      return action.paper ? <PaperPreview paper={action.paper} /> : null
    case 'render_diagnostic':
      return action.diagnostic ? (
        <DiagnosticPreview diagnostic={action.diagnostic} />
      ) : null
    case 'render_upload':
      return <InlineUpload />
    case 'render_cta':
      if (action.cta) return <InlineCTA cta={action.cta} />
      if (action.params) {
        return (
          <InlineCTA
            cta={{
              text: action.params.text || 'Get started',
              href: action.params.href || '/auth/signup',
              style: action.params.style === 'secondary' ? 'secondary' : 'primary',
            }}
          />
        )
      }
      return null
    default:
      return null
  }
}
