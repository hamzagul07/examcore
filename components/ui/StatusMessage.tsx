'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'info' | 'alert' | 'success'

type Props = {
  children: ReactNode
  tone?: Tone
  className?: string
}

const TONE: Record<Tone, string> = {
  info: 'border-[var(--ec-border)] bg-[var(--ec-surface-raised)] text-[var(--ec-text-secondary)]',
  alert: 'border-[color-mix(in_srgb,var(--ec-danger,#b91c1c)_35%,transparent)] bg-[color-mix(in_srgb,var(--ec-danger,#b91c1c)_8%,transparent)] text-[var(--ec-text-primary)]',
  success:
    'border-[color-mix(in_srgb,var(--ec-brand)_35%,transparent)] bg-[var(--ec-brand-muted)] text-[var(--ec-text-primary)]',
}

/** Inline status slip for forms (desk language). */
export function StatusMessage({ children, tone = 'info', className }: Props) {
  return (
    <p
      role={tone === 'alert' ? 'alert' : 'status'}
      className={cn(
        'rounded-[var(--radius,4px)] border px-4 py-3 text-sm leading-relaxed',
        TONE[tone],
        className
      )}
    >
      {children}
    </p>
  )
}
