'use client'

import { RichTextRenderer } from '@/components/RichTextRenderer'

/**
 * @deprecated Prefer `RichTextRenderer` — kept for existing imports (whole-paper, etc.).
 */
export function MarkdownMath({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  return <RichTextRenderer text={text} className={className} variant="dark" />
}
