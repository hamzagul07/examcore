'use client'

import { useEffect, useState } from 'react'
import { useOmniAI } from '@/lib/omni-ai/context'
import { cn } from '@/lib/utils'

type CommandKTriggerProps = {
  className?: string
}

/** SSR-safe platform hint — starts with ⌘ and corrects to Ctrl after mount. */
function useShortcutHint() {
  const [hint, setHint] = useState('⌘K')
  useEffect(() => {
    if (!/Mac|iPhone|iPad/i.test(navigator.platform)) setHint('Ctrl K')
  }, [])
  return hint
}

export function CommandKTrigger({ className }: CommandKTriggerProps) {
  const { setIsOpen } = useOmniAI()
  const hint = useShortcutHint()

  return (
    <button
      type="button"
      className={cn('ec-cmdk-btn', className)}
      onClick={() => setIsOpen(true)}
      title={`Search (${hint})`}
      aria-label="Open search"
    >
      <span className="font-mono text-[11px] font-bold" aria-hidden>/</span>
      <span>search</span>
      <kbd>{hint}</kbd>
    </button>
  )
}

/** Full-width mobile menu entry — opens Ask MarkScheme / search. */
export function MobileSearchMenuButton({ onActivate }: { onActivate?: () => void }) {
  const { setIsOpen } = useOmniAI()

  return (
    <button
      type="button"
      className="ec-nav-mobile-search"
      onClick={() => {
        setIsOpen(true)
        onActivate?.()
      }}
    >
      <span className="font-mono text-[11px] font-bold" aria-hidden>/</span>
      Search / Ask MarkScheme
    </button>
  )
}
