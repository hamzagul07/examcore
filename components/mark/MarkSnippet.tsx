'use client'

import { cn } from '@/lib/utils'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import { prepareMarkingSnippet } from '@/lib/rich-text/normalize-marking-text'

type Props = {
  text: string
  className?: string
}

/** Compact inline math/markdown for audit rows and exam sheet lines. */
export function MarkSnippet({ text, className }: Props) {
  const prepared = prepareMarkingSnippet(text)
  if (!prepared) return null

  return (
    <RichTextRenderer
      text={prepared}
      className={cn('ms-mark-snippet', className)}
    />
  )
}
