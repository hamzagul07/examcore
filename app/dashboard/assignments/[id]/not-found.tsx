import Link from 'next/link'

/**
 * A set the student cannot open: it does not exist, was deleted, is for
 * other students, or they are no longer in the class. One message for all of
 * them — the page must not confirm that someone else's set exists.
 */
export default function StudentSetNotFound() {
  return (
    <main className="app-shell app-shell-tabbed">
      <div className="mx-auto w-full min-w-0 max-w-xl pb-10 pt-6">
        <div className="ec-card ec-card--paper p-6 text-center sm:p-8">
          <span className="ec-ink-stamp ec-ink-stamp--crimson ec-ink-stamp--hero mx-auto mb-5" aria-hidden>
            404
          </span>
          <h1 className="text-headline mb-2 text-[var(--ec-text-primary)]">This set isn&apos;t open to you</h1>
          <p className="text-body mx-auto max-w-sm text-[var(--ec-text-secondary)]">
            It may have been removed by your teacher, or you may no longer be in the class it was set for.
          </p>
          <Link
            href="/dashboard/assignments"
            className="ec-btn-primary mt-7 inline-flex min-h-[48px] items-center justify-center px-6"
          >
            See your sets
          </Link>
        </div>
      </div>
    </main>
  )
}
