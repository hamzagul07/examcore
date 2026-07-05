'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { LoadingLink } from '@/components/ui/LoadingLink'

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
    <main className="app-shell flex min-h-[60vh] items-center justify-center px-4">
      <div className="ec-card relative mx-auto w-full max-w-lg overflow-hidden p-8 text-center sm:p-12">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full blur-[80px] opacity-70"
          style={{ background: 'var(--ec-chip-critical-bg)' }}
          aria-hidden
        />
        <p className="ec-label-tech ec-score-low relative mb-4 justify-center">Something went wrong</p>
        <h1 className="text-headline relative mb-3">We hit a snag</h1>
        <p className="text-body relative mb-8">
          An unexpected error occurred. Try again, or head to a safe page while we
          recover. Your work on other pages is unaffected.
        </p>
        <div className="relative flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <button type="button" onClick={reset} className="ec-btn-primary justify-center px-7 py-3.5">
            Try again
          </button>
          <LoadingLink
            href="/mark"
            loadingText="Opening…"
            className="ec-btn-secondary justify-center px-7 py-3.5"
          >
            Mark a question
          </LoadingLink>
          <LoadingLink
            href="/"
            loadingText="Opening…"
            className="ec-btn-ghost justify-center px-7 py-3.5"
          >
            Go home
          </LoadingLink>
        </div>
        <p className="ec-not-found-hint relative">
          Still stuck?{' '}
          <Link href="/faq" className="ec-link">
            Read the FAQ
          </Link>
          {' or '}
          <Link href="/contact" className="ec-link">
            contact us
          </Link>
          .
        </p>
      </div>
    </main>
  )
}
