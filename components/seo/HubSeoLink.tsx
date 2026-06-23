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
        ? 'inline-flex rounded-full border border-[var(--ec-border)] px-3 py-1.5 text-xs font-semibold text-[var(--ec-text-secondary)] no-underline hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]'
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
