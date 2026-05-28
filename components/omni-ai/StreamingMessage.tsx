'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
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
            <MarkdownBody content={message.content} />
            {message.isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-emerald-400" />
            )}
          </div>
        )}

        {showSplitPaper && message.action?.paper && (
          <>
            <div className="prose prose-invert prose-sm max-w-none rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-4 py-3 hidden lg:block">
              <MarkdownBody content={message.content} />
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

function MarkdownBody({ content }: { content: string }) {
  if (!content) return null
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => (
          <p className="mb-2 leading-relaxed text-slate-200 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-white">{children}</strong>
        ),
        em: ({ children }) => <em className="text-emerald-300">{children}</em>,
        ul: ({ children }) => (
          <ul className="my-2 list-disc space-y-1 pl-5 text-slate-200">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 list-decimal space-y-1 pl-5 text-slate-200">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        code: ({ children }) => (
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-emerald-300">
            {children}
          </code>
        ),
        h3: ({ children }) => (
          <h3 className="mb-2 mt-3 text-lg font-bold text-white">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="mb-2 mt-2 text-base font-semibold text-white">{children}</h4>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-emerald-500/40 pl-3 italic text-slate-400">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
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
