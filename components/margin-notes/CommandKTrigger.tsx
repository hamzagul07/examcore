'use client'

import { Search } from 'lucide-react'
import { useOmniAI } from '@/lib/omni-ai/context'
import { cn } from '@/lib/utils'

type CommandKTriggerProps = {
  className?: string
}

export function CommandKTrigger({ className }: CommandKTriggerProps) {
  const { setIsOpen } = useOmniAI()

  return (
    <button
      type="button"
      className={cn('ec-cmdk-btn', className)}
      onClick={() => setIsOpen(true)}
      title="Search (⌘K)"
      aria-label="Open search"
    >
      <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>search</span>
      <kbd>⌘K</kbd>
    </button>
  )
}
