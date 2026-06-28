'use client'

import { RouteError } from '@/components/ui/RouteError'

export default function TeacherError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteError
      {...props}
      title="Couldn't load this classroom view"
      description="Something went wrong loading your teacher tools. Try again, or head to a safe page while we recover."
    />
  )
}
