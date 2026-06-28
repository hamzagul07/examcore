'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { LoadingLink } from '@/components/ui/LoadingLink'

/**
 * Shared section-level error UI for route-group `error.tsx` boundaries.
 * Renders inside the section's own layout (keeping its chrome/nav), so it uses a
 * `<div>` rather than `<main>` to avoid nesting a second landmark.
 */
export function RouteError({
  error,
  reset,
  eyebrow = 'Something went wrong',
  title = 'We hit a snag',
  description = 'An unexpected error occurred on this page. Try again, or head to a safe page while we recover. Your work on other pages is unaffected.',
}: {
  error: Error & { digest?: string }
  reset: () => void
  eyebrow?: string
  title?: string
  description?: string
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="app-shell flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto max-w-lg text-center" role="alert">
        <p className="ec-label-tech ec-score-low mb-4 justify-center">{eyebrow}</p>
        <h1 className="text-headline mb-3">{title}</h1>
        <p className="text-body mb-8">{description}</p>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <button type="button" onClick={reset} className="ec-btn-primary justify-center px-7 py-3.5">
            Try again
          </button>
          <LoadingLink
            href="/"
            loadingText="Opening…"
            className="ec-btn-ghost justify-center px-7 py-3.5"
          >
            Go home
          </LoadingLink>
        </div>
        <p className="ec-not-found-hint">
          Still stuck?{' '}
          <Link href="/contact" className="ec-link">
            contact us
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
