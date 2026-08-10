'use client'

import { RichTextRenderer } from '@/components/RichTextRenderer'
import type { OmniAIMessage, OmniAIAction } from '@/lib/omni-ai/types'
import { PaperPreview } from '@/components/command-bar/PaperPreview'
import { DiagnosticPreview } from '@/components/command-bar/DiagnosticPreview'
import { InlineUpload } from '@/components/command-bar/InlineUpload'
import { InlineCTA } from '@/components/command-bar/InlineCTA'
import { SplitScreenPreview } from './SplitScreenPreview'
import { StreamingCaret } from './StreamingCaret'
import { ThinkingIndicator } from './ThinkingIndicator'

interface StreamingMessageProps {
  message: OmniAIMessage
  splitPaper?: boolean
}

export function StreamingMessage({ message, splitPaper = false }: StreamingMessageProps) {
  if (message.role === 'user') {
    return (
      <div className="ms-omni-msg user ec-chat-message-enter">
        <RichTextRenderer text={message.content} variant="light" />
      </div>
    )
  }

  const showSplitPaper =
    splitPaper &&
    !message.isStreaming &&
    message.action?.type === 'render_paper' &&
    message.action.paper

  const isStreaming = Boolean(message.isStreaming)
  const hasContent = Boolean(message.content)

  return (
    <div className="flex gap-3 ec-chat-message-enter">
      <div
        className={`mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand)] font-mono text-[10px] font-bold tracking-wide ec-on-brand-text ${
          isStreaming && !hasContent ? 'ms-omni-avatar-pulse' : ''
        }`}
        aria-hidden
      >
        MS
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        {!showSplitPaper && (
          <div
            className={`ms-omni-answer ${isStreaming ? 'ms-omni-answer--streaming' : 'ms-omni-answer--settled'} rounded border ec-border-color bg-[var(--ec-paper,var(--ec-surface-raised))] px-4 py-3 text-[var(--ec-text-primary)]`}
            style={{ boxShadow: 'var(--ec-shadow-hard, 3px 3px 0 rgba(0, 0, 0, 0.06))' }}
          >
            {isStreaming ? (
              <div className="text-sm leading-relaxed">
                {hasContent ? (
                  // Mid-stream: plain text avoids re-parsing KaTeX on every chunk.
                  <p className="ms-omni-stream-text whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                ) : (
                  <ThinkingIndicator status={message.status} />
                )}
                <StreamingCaret />
              </div>
            ) : (
              <div className="ms-omni-answer-body">
                <RichTextRenderer text={message.content} variant="light" />
              </div>
            )}
          </div>
        )}

        {showSplitPaper && message.action?.paper && (
          <>
            <div className="ec-card ec-card--paper ms-omni-answer ms-omni-answer--settled hidden border ec-border-color px-4 py-3 text-[var(--ec-text-primary)] lg:block">
              <RichTextRenderer text={message.content} variant="light" />
            </div>
            <SplitScreenPreview
              paper={message.action.paper}
              messageContent={message.content}
            />
          </>
        )}

        {!message.isStreaming && message.action && !showSplitPaper && (
          <div className="ms-omni-action-enter">
            <ActionRenderer action={message.action} />
          </div>
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
