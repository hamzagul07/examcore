/** Visual separator between OAuth and email/password auth. */
export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="relative my-6" aria-hidden>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[var(--ec-border)]" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-[var(--ec-surface)] px-3 text-xs font-medium uppercase tracking-wider text-[var(--ec-text-secondary)]">
          {label}
        </span>
      </div>
    </div>
  )
}
