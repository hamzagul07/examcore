'use client'

import { Sparkles } from 'lucide-react'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import type { OmniAIMessage, OmniAIAction } from '@/lib/omni-ai/types'
import { PaperPreview } from '@/components/command-bar/PaperPreview'
import { DiagnosticPreview } from '@/components/command-bar/DiagnosticPreview'
import { InlineUpload } from '@/components/command-bar/InlineUpload'
import { InlineCTA } from '@/components/command-bar/InlineCTA'
import { SplitScreenPreview } from './SplitScreenPreview'
import { StreamingCaret } from './StreamingCaret'

interface StreamingMessageProps {
  message: OmniAIMessage
  splitPaper?: boolean
}

export function StreamingMessage({ message, splitPaper = false }: StreamingMessageProps) {
  if (message.role === 'user') {
    return (
      <div className="ms-omni-msg user ec-chat-message-enter">{message.content}</div>
    )
  }

  const showSplitPaper =
    splitPaper &&
    !message.isStreaming &&
    message.action?.type === 'render_paper' &&
    message.action.paper

  return (
    <div className="flex gap-3 ec-chat-message-enter">
      <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ec-chat-avatar">
        <Sparkles className="h-4 w-4 ec-on-brand-text" />
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        {!showSplitPaper && (
          <div className="rounded-2xl rounded-bl-md border ec-border-color bg-[var(--ec-surface-raised)] px-4 py-3 text-[var(--ec-text-primary)]">
            {message.isStreaming ? (
              <div className="text-sm leading-relaxed">
                {message.content ? (
                  <span className="whitespace-pre-wrap break-words">{message.content}</span>
                ) : (
                  <span className="text-[var(--ec-text-secondary)]">Thinking</span>
                )}
                <StreamingCaret />
              </div>
            ) : (
              <RichTextRenderer text={message.content} variant="light" />
            )}
          </div>
        )}

        {showSplitPaper && message.action?.paper && (
          <>
            <div className="ec-card hidden rounded-2xl rounded-bl-md border ec-border-color px-4 py-3 text-[var(--ec-text-primary)] lg:block">
              <RichTextRenderer text={message.content} variant="light" />
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
    </div>
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
