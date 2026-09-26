'use client'

import { motion } from 'framer-motion'
import { PaperPreview } from '@/components/command-bar/PaperPreview'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import type { ChatPaperPayload } from '@/lib/chat-intents'
import type { MarkdownLinkFilter } from '@/lib/rich-text/markdown-components'

interface SplitScreenPreviewProps {
  paper: ChatPaperPayload
  messageContent: string
  /** Passed through to the prose (see StreamingMessage). */
  linkFilter?: MarkdownLinkFilter
}

export function SplitScreenPreview({
  paper,
  messageContent,
  linkFilter,
}: SplitScreenPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 gap-4 lg:grid-cols-2"
    >
      {messageContent && (
        <div
          className="ec-card ec-card--paper border px-4 py-3 text-sm text-[var(--ec-text-secondary)] lg:hidden"
          style={{
            borderColor: 'var(--ec-border)',
            background: 'var(--ec-surface-raised)',
          }}
        >
          <RichTextRenderer text={messageContent} variant="light" linkFilter={linkFilter} />
        </div>
      )}
      <PaperPreview paper={paper} />
    </motion.div>
  )
}
