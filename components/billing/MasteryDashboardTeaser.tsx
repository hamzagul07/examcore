'use client'

import Link from 'next/link'

/**
 * The mastery lock.
 *
 * Two things were wrong with the original and both cost conversions:
 *
 * 1. It blurred whatever it was handed, and for the ~89% of accounts that have
 *    marked nothing that was the *empty* state — so the lock covered three
 *    placeholder panels. The caller now passes the seeded student instead
 *    (MasteryPreviewDemo), so there is genuinely something under the blur.
 *
 * 2. `opacity: 0.35` under a 72% scrim erases shape as well as detail, which
 *    means the reader cannot tell a mastery map from a pricing table. The rule
 *    worth holding: **a blur may hide detail, never shape.** You should be able
 *    to count the topic rows and see which are green and which are red — that
 *    is the thing being sold — while being unable to read the numbers.
 *
 * `isPreview` keeps it honest: when the panel underneath belongs to a made-up
 * student it says so, rather than letting a reader assume those are their marks.
 */
export function MasteryDashboardTeaser({
  children,
  isPreview = false,
}: {
  children: React.ReactNode
  /** True when the blurred panel is the seeded example, not the reader's data. */
  isPreview?: boolean
}) {
  return (
    <div className="ms-mastery-lock">
      <div className="ms-mastery-lock__under" aria-hidden>
        {children}
      </div>

      <div className="ms-mastery-lock__scrim">
        <div className="ms-mastery-lock__panel">
          <span className="ec-ink-stamp ms-mastery-lock__stamp" aria-hidden>
            Δ
          </span>
          <h2 className="ms-mastery-lock__title serif">
            {isPreview
              ? 'This is what the map looks like after 18 marked questions'
              : 'Your mastery map is ready to unlock'}
          </h2>
          <p className="ms-mastery-lock__body">
            {isPreview ? (
              <>
                The panel behind this belongs to an example student, because the
                map is built from marked answers and yours has none yet. Mark a
                few questions and it fills in with your topics, your weak spots
                and your trajectory.
              </>
            ) : (
              <>
                Topic-by-topic strength, your predicted grade and syllabus
                coverage — all built from questions you have already marked.
              </>
            )}
          </p>
          <div className="ms-mastery-lock__actions">
            <Link href="/pricing" className="ec-btn-primary ms-mastery-lock__cta">
              Unlock with any paid plan
            </Link>
            <Link
              href="/demo?scene=map"
              className="ec-btn-ghost ms-mastery-lock__cta"
            >
              See a full account first
            </Link>
          </div>
          {isPreview && (
            <p className="ms-mastery-lock__foot">
              Example data — not your marks.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
