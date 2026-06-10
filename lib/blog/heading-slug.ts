import type { ReactNode } from 'react'

/** Headings omitted from fan-out chunks and the article TOC. */
export const SKIP_BLOG_HEADINGS =
  /^(what to read|bottom line|sources|references|table of contents)$/i

export function isSkippedBlogHeading(text: string): boolean {
  return SKIP_BLOG_HEADINGS.test(text.replace(/\*\*/g, '').trim())
}

/** Stable anchor id shared by TOC, fan-out chunks, and markdown headings. */
export function headingSlug(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 72)
}

export function headingPlainText(children: ReactNode): string {
  if (typeof children === 'string') return children.replace(/\*\*/g, '').trim()
  if (Array.isArray(children)) {
    return children
      .map((c) => (typeof c === 'string' ? c.replace(/\*\*/g, '') : ''))
      .join('')
      .trim()
  }
  return ''
}
