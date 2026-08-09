import Link from 'next/link'
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
      <div className="mb-3 flex items-center gap-2">
        <p className="ec-eyebrow mb-0">Home desk</p>
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          M1
        </span>
      </div>

      {countdown.kind === 'future' && examDate ? (
        <ExamCountdownHero
          firstName={firstName}
          examDate={examDate}
          daysLeft={countdown.daysLeft}
          weeklyAttempts={weeklyAttempts}
        />
      ) : countdown.kind === 'past' ? (
        <aside className="ms-mark-example-slip mb-6" aria-label="Exam date passed">
          <div className="ms-mark-example-slip__body">
            <span className="ec-ink-stamp" aria-hidden>
              ✓
            </span>
            <div className="ms-mark-example-slip__copy">
              <p className="ms-mark-example-slip__title">
                Hope your exams went well
              </p>
              <p className="ms-mark-example-slip__lead">
                Set a new date when you&apos;re ready — the desk keeps every mark
                you filed.
              </p>
              <span className="ms-mark-example-slip__note" aria-hidden>
                update the date when the next sitting lands
              </span>
            </div>
          </div>
          <Link
            href="/account/exam"
            className="ms-mark-example-slip__cta inline-flex min-h-[44px] items-center font-mono text-xs font-bold uppercase tracking-wide text-[var(--ec-brand)]"
          >
            Update date -&gt;
          </Link>
        </aside>
      ) : (
        <div className="mb-4">
          <h1 className="text-hero">
            <span className="text-[var(--ec-text-primary)]">{greeting}</span>
          </h1>
          {!examDate && (
            <p className="text-caption mt-3">
              <Link
                href="/account/exam"
                className="text-[var(--ec-text-secondary)] underline-offset-2 hover:text-[var(--ec-brand)] hover:underline"
              >
                Set your exam date to track progress -&gt;
              </Link>
            </p>
          )}
        </div>
      )}

      {/* hideMarkCta: NextActionCard owns the primary CTA on the mature desk. */}
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
