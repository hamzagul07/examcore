import { LoadingLink } from '@/components/ui/LoadingLink'
import type { NextAction } from '@/lib/dashboard/next-action'

type Props = {
  action: NextAction
}

/** Dominant “do this next” slip for returning dashboard home (DB-02). */
export function NextActionCard({ action }: Props) {
  const showDueLoop = action.kind === 'review' && (action.dueCount ?? 0) > 1

  return (
    <section
      className="ms-insight-hero ms-action-card ms-next-action mb-6"
      aria-labelledby="dash-next-action-title"
    >
      <div className="ms-insight-hero__meta mb-3">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          {action.stamp}
        </span>
        <p className="ec-eyebrow mb-0">Do this next</p>
      </div>
      <h2 id="dash-next-action-title" className="text-title" style={{ margin: 0 }}>
        {action.title}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--ec-text-secondary)]">
        {action.why}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <LoadingLink
          href={action.href}
          variant="button"
          loadingText={action.ctaLabel}
          className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center px-5 text-sm"
        >
          {action.ctaLabel}
        </LoadingLink>
        {action.secondary ? (
          <LoadingLink
            href={action.secondary.href}
            variant="inline"
            className="inline-flex min-h-[44px] items-center px-1 text-sm font-medium text-[var(--ec-text-secondary)] underline-offset-4 transition-colors hover:text-[var(--ec-brand)] hover:underline"
          >
            {action.secondary.label}
          </LoadingLink>
        ) : null}
      </div>
      {showDueLoop ? (
        <p className="ms-next-action__loop mt-4">
          <LoadingLink
            href="/dashboard/review"
            variant="inline"
            className="ms-next-action__loop-link"
          >
            {action.dueCount} topics waiting · close one today
          </LoadingLink>
        </p>
      ) : null}
    </section>
  )
}
