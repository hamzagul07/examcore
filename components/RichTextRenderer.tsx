'use client'

import 'katex/dist/katex.min.css'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import {
  createMarkdownComponents,
  type RichTextVariant,
} from '@/lib/rich-text/markdown-components'
import { normalizeMarkingText } from '@/lib/rich-text/normalize-marking-text'

export type RichTextRendererProps = {
  /** Markdown + LaTeX source ($...$ inline, $$...$$ block). */
  text: string
  className?: string
  variant?: RichTextVariant
}

/**
 * Single source of truth for Claude marking output and Omni-AI prose:
 * markdown (bold, lists, tables, code) + KaTeX math.
 */
export function RichTextRenderer({
  text,
  className = '',
  variant = 'dark',
}: RichTextRendererProps) {
  if (!text?.trim()) return null

  const normalized = normalizeMarkingText(text)
  const components = createMarkdownComponents(variant)
  const proseClass =
    variant === 'dark'
      ? 'prose prose-invert prose-sm max-w-none'
      : 'prose prose-sm max-w-none'

  return (
    <div className={`${proseClass} ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[[remarkMath, { singleDollarTextMath: true }], remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  )
}
