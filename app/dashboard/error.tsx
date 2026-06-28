'use client'

import { RouteError } from '@/components/ui/RouteError'

export default function DashboardError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteError
      {...props}
      title="Couldn't load your dashboard"
      description="We couldn't load this part of your dashboard. Try again, or head to a safe page while we recover."
    />
  )
}
