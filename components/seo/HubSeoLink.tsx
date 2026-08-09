'use client'

import Link from 'next/link'
import { LoadingLink } from '@/components/ui/LoadingLink'

export function HubSeoLink({
  href,
  label,
  variant = 'ghost',
}: {
  href: string
  label: string
  variant?: 'primary' | 'ghost' | 'muted'
}) {
  const className =
    variant === 'primary'
      ? 'ec-btn-primary px-4 py-2 text-sm'
      : variant === 'muted'
        ? 'inline-flex rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wide shadow-[var(--ec-shadow-hard,2px_2px_0_rgba(0,0,0,0.05))] text-[var(--ec-text-secondary)] no-underline hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]'
        : 'ec-btn-ghost px-4 py-2 text-sm no-underline'

  if (variant === 'primary') {
    return (
      <LoadingLink href={href} className={className} loadingText="Opening…">
        {label}
      </LoadingLink>
    )
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  )
}
