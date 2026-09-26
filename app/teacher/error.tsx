'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { LoadingLink } from '@/components/ui/LoadingLink'

/**
 * Error boundary for every teacher route. It renders inside the teacher
 * layout, so the header and tab bar stay put and the teacher is one tap from
 * the desk; that is also why it is a <section>, not a second <main>.
 *
 * The digest is shown because it is the one thing support can look up: a
 * teacher who reports "the matrix broke" with it saves a round of questions.
 */
export default function TeacherError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[teacher] route error', error)
  }, [error])

  return (
    <section className="ms-teacher-notfound" role="alert" aria-labelledby="teacher-error-title">
      <span className="ms-teacher-notfound__stamp" aria-hidden>
        A0
      </span>
      <h1 id="teacher-error-title" className="ms-teacher-notfound__title">
        This page didn&apos;t load
      </h1>
      <p className="ms-teacher-notfound__body">
        Something went wrong fetching this part of your desk. Nothing you saved is lost — try
        again, or go back to the desk and come in another way.
      </p>
      {error.digest ? (
        <p className="ms-teacher-notfound__body font-mono text-xs">Reference: {error.digest}</p>
      ) : null}
      <div className="ms-teacher-notfound__actions">
        <button
          type="button"
          onClick={reset}
          className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center"
        >
          Try again
        </button>
        <LoadingLink
          href="/teacher/dashboard"
          loadingText="Opening…"
          className="ec-btn-ghost inline-flex min-h-[44px] items-center justify-center"
        >
          Back to your desk
        </LoadingLink>
      </div>
      <p className="ms-teacher-notfound__body text-sm">
        Keeps happening?{' '}
        <Link href="/contact" className="ec-link">
          Tell us
        </Link>{' '}
        and include the reference above.
      </p>
    </section>
  )
}
