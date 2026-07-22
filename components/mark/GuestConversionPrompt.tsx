'use client'

import Link from 'next/link'
import { ArrowRight, BookmarkX, LineChart, Target } from 'lucide-react'

/**
 * The signup ask, placed at the moment it is actually earned.
 *
 * Guests can already mark without an account — the route is public and the API
 * supports a null user. But the funnel showed everyone signing up *first*,
 * i.e. being asked to commit before seeing anything work. This asks after the
 * marks are on screen, when the value is no longer hypothetical.
 *
 * It is deliberately honest about the cost of not signing up: a guest mark is
 * genuinely not saved anywhere they can get back to, and saying so plainly is
 * more persuasive than a generic "sign up for more".
 */
export function GuestConversionPrompt({
  marksEarned,
  totalMarks,
  weakTopics,
}: {
  marksEarned: number | null
  totalMarks: number | null
  weakTopics: string[]
}) {
  const scored =
    typeof marksEarned === 'number' && typeof totalMarks === 'number' && totalMarks > 0
      ? `${marksEarned}/${totalMarks}`
      : null
  const topic = weakTopics[0]

  return (
    <div className="ec-card space-y-4 border-[var(--ec-brand)]/40 bg-[var(--ec-brand)]/[0.04] p-5">
      <div>
        <p className="text-base font-semibold text-[var(--ec-text-primary)]">
          {scored
            ? `You scored ${scored} — but this mark isn't saved anywhere.`
            : "This mark isn't saved anywhere."}
        </p>
        <p className="mt-1 text-sm text-[var(--ec-text-secondary)]">
          You marked this as a guest. Close the tab and it&apos;s gone — there&apos;s
          no history to come back to. A free account keeps every mark and starts
          tracking what you keep dropping.
        </p>
      </div>

      <ul className="space-y-2.5 text-sm text-[var(--ec-text-secondary)]">
        <li className="flex items-start gap-2.5">
          <BookmarkX className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ec-brand)]" aria-hidden="true" />
          <span>Every mark saved, with the examiner ink on your own pages.</span>
        </li>
        <li className="flex items-start gap-2.5">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ec-brand)]" aria-hidden="true" />
          <span>
            {topic
              ? `Track ${topic} across papers, so you can see it improve.`
              : 'Weak topics tracked across papers, so you can see them improve.'}
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <LineChart className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ec-brand)]" aria-hidden="true" />
          <span>A predicted grade that updates as you mark more.</span>
        </li>
      </ul>

      <Link
        href={`/auth/signup?next=${encodeURIComponent('/mark')}`}
        className="ec-btn-primary inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 text-sm font-semibold"
      >
        Create a free account
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      <p className="text-center text-xs text-[var(--ec-text-secondary)]">
        Free — no card needed. You can keep marking as a guest if you&apos;d rather.
      </p>
    </div>
  )
}
