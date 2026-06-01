import Link from 'next/link'
import { ArrowRight, Calendar } from 'lucide-react'
import { examCountdown, timeGreeting } from '@/lib/dashboard/exam-date'
import { ExamCountdownHero } from './ExamCountdownHero'

type Props = {
  firstName: string
  examDate: string | null
  weeklyAttempts: number
}

export function HomeHero({ firstName, examDate, weeklyAttempts }: Props) {
  const countdown = examCountdown(examDate)
  const greeting = timeGreeting(firstName)

  return (
    <section className="mb-8 lg:mb-10">
      <p className="ec-label-tech mb-3">HOME</p>

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
              <Link href="/account" className="underline underline-offset-2">
                Update exam date in account settings
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
                href="/account"
                className="text-[var(--ec-text-secondary)] underline-offset-2 hover:text-[var(--ec-brand)] hover:underline"
              >
                Set your exam date to track progress
              </Link>
            </p>
          )}
        </div>
      )}

      {countdown.kind !== 'future' && (
        <>
          <Link
            href="/mark"
            className="ec-btn-primary inline-flex w-full justify-center sm:w-auto"
          >
            Mark a question
            <ArrowRight className="h-4 w-4" />
          </Link>

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
