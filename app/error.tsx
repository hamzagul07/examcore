'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="app-shell flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <p className="ec-label-tech ec-score-low mb-4 justify-center">Something went wrong</p>
        <h1 className="text-headline mb-3">We hit a snag</h1>
        <p className="text-body mb-8">
          An unexpected error occurred. You can try again, or return to a safe
          page while we recover.
        </p>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className="ec-btn-primary justify-center px-7 py-3.5">
            Try again
          </button>
          <Link href="/dashboard" className="ec-btn-secondary justify-center px-7 py-3.5">
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
