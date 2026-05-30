'use client'

import { RichTextRenderer } from '@/components/RichTextRenderer'

/** Solution / light-background markdown + math (uses shared renderer). */
export function MarkdownWithMath({ content }: { content: string }) {
  if (!content) return null
  return (
    <div className="space-y-3 text-slate-300 [&_.katex]:text-slate-800">
      <RichTextRenderer text={content} variant="light" />
    </div>
  )
}
