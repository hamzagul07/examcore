'use client'

import { RichTextRenderer } from '@/components/RichTextRenderer'

/** Worked-solution markdown + math on themed cards (uses design tokens). */
export function MarkdownWithMath({ content }: { content: string }) {
  if (!content) return null
  return (
    <div className="space-y-3">
      <RichTextRenderer text={content} variant="dark" />
    </div>
  )
}
