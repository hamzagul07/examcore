'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
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
      <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
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
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      Search / Ask MarkScheme
    </button>
  )
}
