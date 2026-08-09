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
