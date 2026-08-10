/** Animated thinking / status state shown before the first streamed token. */
export function ThinkingIndicator({ status }: { status?: string | null }) {
  const label = status?.trim() || 'Thinking'
  return (
    <span className="ms-omni-thinking" aria-live="polite" aria-label={label}>
      <span className="ms-omni-thinking-label">{label}</span>
      <span className="ms-omni-thinking-dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
    </span>
  )
}
