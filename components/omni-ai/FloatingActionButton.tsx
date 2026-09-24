'use client'

import { usePathname } from 'next/navigation'

interface FABProps {
  onClick: () => void
  isOpen: boolean
}

/**
 * Ask MarkScheme — prototype-style floating pill (all breakpoints on app
 * routes). Not on the Exam Roadmap: the pill sits over the timeline's
 * right-hand column, which is where the Done buttons are, and the roadmap
 * has its own "I need help" path in the check-in sheet.
 */
export function FloatingActionButton({ onClick, isOpen }: FABProps) {
  const pathname = usePathname()
  if (pathname?.startsWith('/dashboard/plan')) return null
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? 'Close Ask MarkScheme' : 'Open Ask MarkScheme'}
      aria-expanded={isOpen}
      className="ms-omni-fab"
    >
      <span
        className="inline-grid h-5 min-w-5 shrink-0 place-items-center rounded border border-[color-mix(in_srgb,var(--ec-on-brand-text,#fff)_35%,transparent)] bg-[color-mix(in_srgb,var(--ec-on-brand-text,#fff)_12%,transparent)] px-1 font-mono text-[10px] font-bold tracking-wide"
        aria-hidden
      >
        ¶
      </span>
      <span className="hidden min-[420px]:inline">ask MarkScheme</span>
      <span className="min-[420px]:hidden">Ask</span>
    </button>
  )
}
