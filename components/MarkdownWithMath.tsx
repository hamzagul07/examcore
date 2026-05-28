'use client'

import 'katex/dist/katex.min.css'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

/**
 * Renders markdown with embedded LaTeX math.
 * - Inline math: $...$
 * - Block math: $$...$$
 */
export function MarkdownWithMath({ content }: { content: string }) {
  if (!content) return null

  return (
    <div className="space-y-3 text-slate-300 [&_.katex]:text-slate-100">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="leading-relaxed text-slate-700">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-6 text-slate-700">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-6 text-slate-700">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="rounded-md border border-white/10 bg-dark-900/80 px-1.5 py-0.5 font-mono text-xs text-emerald-300">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-xl border border-white/10 bg-dark-900/80 p-4 font-mono text-xs text-slate-200">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-emerald-500/50 pl-4 italic text-slate-400">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-white/10" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
