'use client'

import { StatusMessage } from '@/components/ui/StatusMessage'

type Props = {
  message: string
  className?: string
}

/** Accessible form success — polite live region, no focus steal. */
export function FormSuccessStatus({ message, className = '' }: Props) {
  if (!message) return null
  return (
    <StatusMessage
      tone="success"
      className={`ms-auth-success ${className}`.trim()}
    >
      {message}
    </StatusMessage>
  )
}
