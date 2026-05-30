'use client'

import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

/**
 * Renders marking feedback with markdown + LaTeX ($...$ / $$...$$).
 * Matches Omni-AI StreamingMessage styling.
 */
export function MarkdownMath({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  if (!text?.trim()) return null

  return (
    <div
      className={`prose prose-invert prose-sm max-w-none ${className}`.trim()}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 leading-relaxed text-slate-200 last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => <em className="text-emerald-300">{children}</em>,
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-5 text-slate-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5 text-slate-200">
              {children}
            </ol>
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
            <h4 className="mb-2 mt-2 text-base font-semibold text-white">
              {children}
            </h4>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-emerald-500/40 pl-3 italic text-slate-400">
              {children}
            </blockquote>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
