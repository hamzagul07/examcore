import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { EmptyStateIllustration } from '@/components/ui/EmptyStateIllustration'

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
    <div className="ec-card relative overflow-hidden p-10 text-center sm:p-12">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-[100px]"
        style={{ background: 'color-mix(in srgb, var(--ec-brand) 15%, transparent)' }}
      />
      <div className="relative">
        <div className="mx-auto mb-5 flex justify-center">
          <EmptyStateIllustration variant={variant} size={160} />
        </div>
        <h3 className="text-headline text-[var(--ec-text-primary)]">{title}</h3>
        <p className="text-body mx-auto mt-3 max-w-sm text-[var(--ec-text-secondary)]">
          {body}
        </p>
        <Link href={ctaHref} className="ec-btn-primary mt-7 inline-flex min-h-[48px]">
          {ctaLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
