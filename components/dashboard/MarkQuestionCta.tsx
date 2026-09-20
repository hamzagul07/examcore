'use client'

import { LoadingLink } from '@/components/ui/LoadingLink'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
  /** Where the button goes; the guided first-mark link when the account is empty. */
  href?: string
  label?: string
}

export function MarkQuestionCta({ className, href = '/mark', label = 'Mark a question →' }: Props) {
  return (
    <LoadingLink
      href={href}
      loadingText="Opening..."
      className={cn(
        'ec-btn-primary inline-flex w-full justify-center sm:w-auto',
        className
      )}
    >
      {label}
    </LoadingLink>
  )
}
