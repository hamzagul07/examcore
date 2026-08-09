import { LoadingLink } from '@/components/ui/LoadingLink'

type AppEmptyStateProps = {
  title: string
  body: string
  ctaLabel: string
  ctaHref: string
  variant?: 'no-attempts' | 'no-data'
}

export function AppEmptyState({
  title,
  body,
  ctaLabel,
  ctaHref,
  variant = 'no-attempts',
}: AppEmptyStateProps) {
  return (
    <div className="ec-card ec-card--paper relative overflow-hidden p-10 text-center sm:p-12">
      <div className="relative">
        <span className="ec-ink-stamp ec-ink-stamp--hero mx-auto mb-5" aria-hidden>
          {variant === 'no-attempts' ? 'M1' : '—'}
        </span>
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ec-brand)]">
          waiting for ink
        </p>
        <h3 className="text-headline text-[var(--ec-text-primary)]">{title}</h3>
        <p className="text-body mx-auto mt-3 max-w-sm text-[var(--ec-text-secondary)]">
          {body}
        </p>
        <LoadingLink
          href={ctaHref}
          loadingText="Opening..."
          className="ec-btn-primary mt-7 inline-flex min-h-[48px]"
        >
          {ctaLabel} →
        </LoadingLink>
      </div>
    </div>
  )
}
