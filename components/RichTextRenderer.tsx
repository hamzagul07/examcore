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

export type RichTextContentKind = 'marking' | 'question' | 'mark_scheme'

export type RichTextRendererProps = {
  /** Markdown + LaTeX source ($...$ inline, $$...$$ block). */
  text: string
  className?: string
  variant?: RichTextVariant
  /**
   * `question` — skip accounting-oriented normalizeMarkingText (preserves $...$
   * in table cells). Caller should run normalizeQuestionText first.
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
      ? text
      : contentKind === 'mark_scheme'
        ? normalizeMarkSchemeText(text)
        : normalizeMarkingText(text)
  const components = createMarkdownComponents(variant)
  const proseClass =
    variant === 'dark'
      ? 'prose prose-sm max-w-none'
      : 'prose prose-sm max-w-none'

  return (
    <div className={`${proseClass} ec-break-anywhere min-w-0 max-w-full overflow-x-auto ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          [remarkMath, { singleDollarTextMath: true }],
        ]}
        // Match CourseRichText / CommunityMarkdown: render best-effort instead of
        // emitting red error markup when a fragment fails to parse.
        rehypePlugins={[[rehypeKatex, { strict: 'ignore', throwOnError: false }]]}
        components={components}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  )
}
