import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ChipVariant = 'ok' | 'no' | 'warn' | 'dim' | 'outline'

const VARIANT_CLASS: Record<ChipVariant, string> = {
  ok: 'ec-chip-ms--ok',
  no: 'ec-chip-ms--no',
  warn: 'ec-chip-ms--warn',
  dim: 'ec-chip-ms--dim',
  outline: 'ec-chip-ms--outline',
}

type ChipProps = {
  variant?: ChipVariant
  children: ReactNode
  className?: string
}

export function Chip({ variant = 'outline', children, className }: ChipProps) {
  return (
    <span className={cn('ec-chip-ms', VARIANT_CLASS[variant], className)}>
      {children}
    </span>
  )
}
