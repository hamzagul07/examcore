'use client'

import { RouteError } from '@/components/ui/RouteError'

export default function MarkError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteError
      {...props}
      title="Marking hit a snag"
      description="Something went wrong loading the marking tool. Try again — your credits are only used once a paper is marked."
    />
  )
}
