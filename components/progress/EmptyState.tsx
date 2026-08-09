import {
  EmptyStateIllustration,
  type IllustrationVariant,
} from '@/components/ui/EmptyStateIllustration'
import { LoadingLink } from '@/components/ui/LoadingLink'

type Props = {
  /** Mono ink stamp shown in the empty visual (e.g. "MX", "∴"). */
  stamp?: string
  title: string
  body: string
  /** When set, the component renders inline (no card) so the parent card's frame shows through. */
  inline?: boolean
  /** Replace the stamp with one of the brand illustrations. */
  illustration?: IllustrationVariant
  ctaLabel?: string
  ctaHref?: string
}

/**
 * Section-level empty state. Used inside each progress card when the user has
 * no data for that view yet. Keeps copy/iconography consistent across sections
 * so empty days feel intentional rather than broken.
 */
export function EmptyState({
  stamp = '¶',
  title,
  body,
  inline,
  illustration,
  ctaLabel,
  ctaHref,
}: Props) {
  const visual = illustration ? (
    <EmptyStateIllustration variant={illustration} size={inline ? 96 : 140} />
  ) : (
    <div
      className="inline-grid h-12 min-w-12 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-2 font-mono text-sm font-bold tracking-wide text-[var(--ec-brand)]"
      aria-hidden
    >
      {stamp}
    </div>
  )

  const cta =
    ctaLabel && ctaHref ? (
      <LoadingLink
        href={ctaHref}
        loadingText="Opening…"
        className="ec-btn-primary ec-btn-primary--sm mt-4 inline-flex min-h-[44px]"
      >
        {ctaLabel}
      </LoadingLink>
    ) : null

  if (inline) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
        {visual}
        <div className="max-w-sm">
          <p className="text-sm font-semibold text-[var(--ec-text-primary)]">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--ec-text-secondary)]">{body}</p>
          {cta}
        </div>
      </div>
    )
  }

  return (
    <div className="ec-card ec-card--paper flex flex-col items-center justify-center gap-3 p-8 text-center">
      {visual}
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-[var(--ec-text-primary)]">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--ec-text-secondary)]">{body}</p>
        {cta}
      </div>
    </div>
  )
}
