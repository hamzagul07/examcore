/**
 * Visible Max status stamp — used on mark results, dashboard, and vault so
 * Max never feels like "Scholar with a bigger number."
 */
export function MaxBadge({
  label = 'Max',
  className = '',
}: {
  label?: string
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ec-text-primary)] shadow-[var(--ec-shadow-hard,2px_2px_0_rgba(0,0,0,0.08))] ${className}`.trim()}
    >
      <span aria-hidden className="ec-ink-stamp" style={{ fontSize: 10, padding: '2px 4px' }}>
        MX
      </span>
      {label}
    </span>
  )
}
