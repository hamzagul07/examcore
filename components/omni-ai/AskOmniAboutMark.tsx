'use client'

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
      <span
        className="inline-grid h-4 min-w-4 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-0.5 text-[9px] font-bold text-[var(--ec-brand)]"
        aria-hidden
      >
        ¶
      </span>
      Ask MarkScheme about this mark
    </button>
  )
}
