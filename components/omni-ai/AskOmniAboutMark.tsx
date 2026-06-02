'use client'

import { Sparkles } from 'lucide-react'
import { useOmniAI } from '@/lib/omni-ai/context'

/**
 * Understated fast path: open Omni with full marking context for this attempt.
 */
export function AskOmniAboutMark({ attemptId }: { attemptId: string }) {
  const { setContext, setIsOpen, clearChat } = useOmniAI()

  return (
    <button
      type="button"
      onClick={() => {
        clearChat()
        setContext({ type: 'marking_result', data: { attemptId } })
        setIsOpen(true)
      }}
      className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-brand)]"
    >
      <Sparkles className="h-3 w-3 shrink-0 opacity-70" />
      Ask MarkScheme about this mark
    </button>
  )
}
