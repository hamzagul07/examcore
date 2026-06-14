import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { examCountdown, timeGreeting } from '@/lib/dashboard/exam-date'
import { ExamCountdownHero } from './ExamCountdownHero'
import { MarkQuestionCta } from './MarkQuestionCta'

type Props = {
  firstName: string
  examDate: string | null
  weeklyAttempts: number
  /** Hide the mark CTA when a dedicated new-user panel handles the primary action. */
  hideMarkCta?: boolean
}

export function HomeHero({
  firstName,
  examDate,
  weeklyAttempts,
  hideMarkCta = false,
}: Props) {
  const countdown = examCountdown(examDate)
  const greeting = timeGreeting(firstName)

  return (
    <section className="ms-dash-hero mb-8 lg:mb-10">
      <p className="ec-eyebrow mb-3">Home</p>

      {countdown.kind === 'future' && examDate ? (
        <ExamCountdownHero
          firstName={firstName}
          examDate={examDate}
          daysLeft={countdown.daysLeft}
          weeklyAttempts={weeklyAttempts}
        />
      ) : countdown.kind === 'past' ? (
        <div className="ec-banner ec-banner-info mb-6">
          <Calendar className="ec-banner__icon h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="ec-banner__title">
              Hope your exams went well — set a new date when you&apos;re ready
            </p>
            <p className="ec-banner__meta mt-1">
              <Link href="/account/exam" className="underline underline-offset-2">
                Update exam date in settings
              </Link>
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <h1 className="text-hero">
            <span className="gradient-text">{greeting}</span>
          </h1>
          {!examDate && (
            <p className="text-caption mt-3">
              <Link
                href="/account/exam"
                className="text-[var(--ec-text-secondary)] underline-offset-2 hover:text-[var(--ec-brand)] hover:underline"
              >
                Set your exam date to track progress
              </Link>
            </p>
          )}
          {hideMarkCta && (
            <p className="text-body mt-3 text-[var(--ec-text-secondary)]">
              Start below — your progress dashboard fills in after your first mark.
            </p>
          )}
        </div>
      )}

      {countdown.kind !== 'future' && !hideMarkCta && (
        <>
          <MarkQuestionCta />

          {weeklyAttempts > 0 && (
            <p className="text-caption mt-3">
              You&apos;ve marked {weeklyAttempts} question
              {weeklyAttempts === 1 ? '' : 's'} this week
            </p>
          )}
        </>
      )}
    </section>
  )
}
