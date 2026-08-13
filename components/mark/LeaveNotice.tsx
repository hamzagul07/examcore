'use client'

import Link from 'next/link'

/**
 * Permission to leave, stated plainly.
 *
 * Every other upload form on the internet has trained students that closing the
 * tab loses the work, so a run that survives a disconnect is only worth
 * anything if they are told it does.
 *
 * Deliberately independent of the mark-run id. It used to live inside the
 * prediction prompt, which renders only once telemetry has handed back a run
 * id — so a failed `mark_runs` insert, which is best-effort by design and
 * cannot fail a mark, silently took the notice down with it. The thing this
 * feature exists to say must not hang off a write that is allowed to fail.
 */
export function LeaveNotice() {
  return (
    <div className="text-sm text-[var(--ec-text-secondary)]">
      <p>
        Marking properly takes a few minutes.{' '}
        <strong className="font-semibold text-[var(--ec-text-primary)]">
          You don&apos;t have to watch it.
        </strong>{' '}
        It finishes without you — carry on somewhere else and we&apos;ll tell you
        the moment it lands, or email you if you&apos;ve gone.
      </p>
      {/* The affordance, not just the reassurance. Telling someone they may
          leave and then leaving them on a progress bar is the same wait. */}
      <p className="mt-3">
        <Link
          href="/dashboard"
          className="font-semibold text-[var(--ec-brand)] underline underline-offset-2"
        >
          Go and do something else →
        </Link>
      </p>
    </div>
  )
}

/** The notice on its own card, for when it is not sharing one with the prompt. */
export function LeaveNoticeCard() {
  return (
    <section className="mt-6 rounded-lg border border-[var(--ec-border)] bg-[var(--ec-surface)] p-5">
      <LeaveNotice />
    </section>
  )
}
