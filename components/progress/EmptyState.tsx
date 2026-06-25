import type { LucideIcon } from 'lucide-react'
import {
  EmptyStateIllustration,
  type IllustrationVariant,
} from '@/components/ui/EmptyStateIllustration'
import { LoadingLink } from '@/components/ui/LoadingLink'

type Props = {
  icon: LucideIcon
  title: string
  body: string
  /** When set, the component renders inline (no card) so the parent card's frame shows through. */
  inline?: boolean
  /** Replace the lucide icon with one of the brand illustrations. */
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
  icon: Icon,
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
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)]">
      <Icon className="h-5 w-5 text-[var(--ec-text-secondary)]" aria-hidden="true" />
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
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        {visual}
        <div className="max-w-md">
          <p className="text-base font-semibold text-[var(--ec-text-primary)]">{title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--ec-text-secondary)]">{body}</p>
          {cta}
        </div>
      </div>
    </div>
  )
}
