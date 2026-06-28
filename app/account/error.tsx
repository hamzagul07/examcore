'use client'

import { RouteError } from '@/components/ui/RouteError'

export default function AccountError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteError
      {...props}
      title="Couldn't load your settings"
      description="Something went wrong loading your account settings. Try again, or head to a safe page while we recover."
    />
  )
}
