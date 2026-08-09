'use client'

import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import {
  createMarkdownComponents,
  type RichTextVariant,
} from '@/lib/rich-text/markdown-components'
import { normalizeMarkingText } from '@/lib/rich-text/normalize-marking-text'
import { normalizeMarkSchemeText } from '@/lib/rich-text/normalize-mark-scheme-text'
import { normalizeQuestionText } from '@/lib/rich-text/normalize-question-text'
import { KATEX_REHYPE_OPTIONS } from '@/lib/rich-text/sanitize-latex'

export type RichTextContentKind = 'marking' | 'question' | 'mark_scheme'

export type RichTextRendererProps = {
  /** Markdown + LaTeX source ($...$ inline, $$...$$ block). */
  text: string
  className?: string
  variant?: RichTextVariant
  /**
   * `question` — wrap/sanitize via normalizeQuestionText (tables + bare math).
   * `marking` — default; Claude/Accounting currency normalization applies.
   */
  contentKind?: RichTextContentKind
}

/**
 * Single source of truth for Claude marking output and Omni-AI prose:
 * markdown (bold, lists, tables, code) + KaTeX math.
 */
export function RichTextRenderer({
  text,
  className = '',
  variant = 'dark',
  contentKind = 'marking',
}: RichTextRendererProps) {
  if (!text?.trim()) return null

  const normalized =
    contentKind === 'question'
      ? normalizeQuestionText(text)
      : contentKind === 'mark_scheme'
        ? normalizeMarkSchemeText(text)
        : normalizeMarkingText(text)
  const components = createMarkdownComponents(variant)
  const proseClass = 'prose prose-sm max-w-none'

  return (
    <div
      className={`${proseClass} ms-rich-text ec-break-anywhere min-w-0 max-w-full overflow-x-auto ${className}`.trim()}
    >
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          [remarkMath, { singleDollarTextMath: true }],
        ]}
        rehypePlugins={[[rehypeKatex, KATEX_REHYPE_OPTIONS]]}
        components={components}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  )
}
