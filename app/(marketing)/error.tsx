'use client'

import { RouteError } from '@/components/ui/RouteError'

export default function MarketingError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteError {...props} />
}
