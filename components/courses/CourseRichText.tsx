'use client'

import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import type { Components } from 'react-markdown'
import { createMarkdownComponents } from '@/lib/rich-text/markdown-components'
import { normalizeCourseText } from '@/lib/courses/normalize-course-text'

export type CourseRichTextVariant = 'prose' | 'inline' | 'formula' | 'flashcard'

const INLINE_UNWRAP: Components = {
  p: ({ children }) => <>{children}</>,
  ol: ({ children }) => <>{children}</>,
  ul: ({ children }) => <>{children}</>,
  li: ({ children }) => <>{children}</>,
  h1: ({ children }) => <>{children}</>,
  h2: ({ children }) => <>{children}</>,
  h3: ({ children }) => <>{children}</>,
  h4: ({ children }) => <>{children}</>,
  h5: ({ children }) => <>{children}</>,
  h6: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => <>{children}</>,
}

export const CourseRichText = memo(function CourseRichText({
  content,
  className = '',
  variant = 'prose',
  breakAnywhere = true,
}: {
  content: string
  className?: string
  variant?: CourseRichTextVariant
  /** When false, avoids overflow-wrap:anywhere (prevents faux "clipping" at box edges). */
  breakAnywhere?: boolean
}) {
  if (!content?.trim()) return null

  const normalized = normalizeCourseText(content)
  const isInline = variant === 'inline'
  const base = createMarkdownComponents('dark')
  const components: Components = isInline
    ? { ...base, ...INLINE_UNWRAP }
    : base

  const variantClass = `course-rich-text course-rich-text--${variant}`
  const wrapClass = breakAnywhere ? 'ec-break-anywhere' : 'course-rich-text-wrap'
  const Wrapper = isInline ? 'span' : 'div'

  return (
    <Wrapper className={`${variantClass} ${wrapClass} min-w-0 max-w-full ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
        rehypePlugins={[[rehypeKatex, { strict: 'ignore', throwOnError: false }]]}
        components={components}
      >
        {normalized}
      </ReactMarkdown>
    </Wrapper>
  )
})
