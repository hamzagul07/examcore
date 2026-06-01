'use client'

import { motion } from 'framer-motion'
import { PaperPreview } from '@/components/command-bar/PaperPreview'
import type { ChatPaperPayload } from '@/lib/chat-intents'

interface SplitScreenPreviewProps {
  paper: ChatPaperPayload
  messageContent: string
}

export function SplitScreenPreview({
  paper,
  messageContent,
}: SplitScreenPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 gap-4 lg:grid-cols-2"
    >
      {messageContent && (
        <div
          className="rounded-2xl border px-4 py-3 text-sm text-[var(--ec-text-secondary)] lg:hidden"
          style={{
            borderColor: 'var(--ec-border)',
            background: 'var(--ec-surface-raised)',
          }}
        >
          {messageContent}
        </div>
      )}
      <PaperPreview paper={paper} />
    </motion.div>
  )
}
