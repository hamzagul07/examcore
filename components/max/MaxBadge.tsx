/**
 * Visible Max status stamp — brand-coloured so Max never reads as plain Scholar.
 */
export function MaxBadge({
  label = 'Max',
  className = '',
}: {
  label?: string
  className?: string
}) {
  return (
    <span className={`ms-vault-badge ${className}`.trim()}>
      <span className="ms-vault-badge__stamp" aria-hidden>
        MX
      </span>
      {label}
    </span>
  )
}
