'use client'

/** Opens the browser's print dialog for the handout on screen. Hidden from the printout itself. */
export function PrintButton({ label = 'Print' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 print:hidden"
    >
      <span className="font-mono text-[11px] font-bold" aria-hidden>
        PRT
      </span>
      {label}
    </button>
  )
}
