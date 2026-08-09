import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Shared text field — 44px touch target on brand `ec-input` (DS-03).
 * Prefer `Field` when you need a labelled control with hint/error wiring.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn('ec-input min-h-[44px] w-full', className)}
      {...props}
    />
  )
}

export { Input }
