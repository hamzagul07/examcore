'use client'

import { PenLine } from 'lucide-react'

interface FABProps {
  onClick: () => void
  isOpen: boolean
}

/** Ask MarkScheme — prototype-style floating pill (all breakpoints on app routes). */
export function FloatingActionButton({ onClick, isOpen }: FABProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? 'Close Ask MarkScheme' : 'Open Ask MarkScheme'}
      aria-expanded={isOpen}
      className="ms-omni-fab"
    >
      <PenLine className="h-5 w-5 shrink-0" aria-hidden />
      <span className="hidden min-[420px]:inline">ask MarkScheme</span>
      <span className="min-[420px]:hidden">Ask</span>
    </button>
  )
}
