'use client'

import Link from 'next/link'
import { lastFunnelBoard, trackFunnelEvent } from '@/lib/analytics/funnel'
import { buildSignUpHref } from '@/lib/auth-redirect'
import { buildMarkReturnPath } from '@/lib/exam-systems/paths'

/**
 * The signup ask, placed at the moment it is actually earned.
 * Examiner’s filing slip — not a soft brand-wash card.
 */
export function GuestConversionPrompt({
  marksEarned,
  totalMarks,
  weakTopics,
  markBoard,
  subjectCode,
}: {
  marksEarned: number | null
  totalMarks: number | null
  weakTopics: string[]
  /** Current /mark board so signup → onboarding → return keeps dialect. */
  markBoard?: string | null
  subjectCode?: string | null
}) {
  const scored =
    typeof marksEarned === 'number' && typeof totalMarks === 'number' && totalMarks > 0
      ? `${marksEarned}/${totalMarks}`
      : null
  const topic = weakTopics[0]
  const board = markBoard ?? lastFunnelBoard()
  const boardKey = (board ?? '').toLowerCase()
  const gradeStamp =
    boardKey === 'ib' ? '7' : boardKey === 'ap' ? '5' : 'A*'
  const gradeSell =
    boardKey === 'ib'
      ? 'A predicted IB level that updates as you mark more.'
      : boardKey === 'ap'
        ? 'A predicted AP score that updates as you mark more.'
        : 'A predicted grade that updates as you mark more.'
  const returnPath = buildMarkReturnPath({ board, subject: subjectCode })
  const signupHref = buildSignUpHref(returnPath)

  return (
    <aside className="ms-guest-slip">
      <div className="ms-guest-slip__head">
        <div>
          <p className="ms-overline" style={{ marginBottom: 6 }}>
            Guest mark
          </p>
          <h2 className="ms-guest-slip__title">
            {scored ? (
              <>
                You scored <em>{scored}</em> — but this ink isn&apos;t filed.
              </>
            ) : (
              <>This mark isn&apos;t filed anywhere.</>
            )}
          </h2>
        </div>
        <span className="ec-ink-stamp ec-ink-stamp--crimson" aria-hidden>
          A0
        </span>
      </div>

      <p className="ms-guest-slip__body">
        You marked this as a guest. Close the tab and it&apos;s gone — there&apos;s
        no history to come back to. A free account keeps every mark and starts
        tracking what you keep dropping.
      </p>

      <ul className="ms-guest-slip__list">
        <li>
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            ✎
          </span>
          <span>Every mark saved, with the examiner ink on your own pages.</span>
        </li>
        <li>
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            M1
          </span>
          <span>
            {topic
              ? `Track ${topic} across papers, so you can see it improve.`
              : 'Weak topics tracked across papers, so you can see them improve.'}
          </span>
        </li>
        <li>
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            {gradeStamp}
          </span>
          <span>{gradeSell}</span>
        </li>
      </ul>

      <p className="ms-guest-slip__note" aria-hidden>
        file the account before the tab closes
      </p>

      <Link
        href={signupHref}
        className="ec-btn-primary mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 text-sm font-semibold"
        onClick={() =>
          trackFunnelEvent('signup_started', {
            source: 'guest_post_mark',
            board: board ?? null,
          })
        }
      >
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          M1
        </span>
        Open your marking desk -&gt;
      </Link>
      <p className="mt-3 text-center text-xs text-[var(--ec-text-secondary)]">
        Free — no card needed. You can keep marking as a guest if you&apos;d rather.
      </p>
    </aside>
  )
}
