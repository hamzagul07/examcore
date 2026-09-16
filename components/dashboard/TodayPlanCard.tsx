import { LoadingLink } from '@/components/ui/LoadingLink'
import { examCountdown } from '@/lib/dashboard/exam-date'
import {
  blockEvidenceKey,
  checkinLine,
  findPlanDay,
  formatMinutes,
  formatPlanDate,
  markedBlocks,
  planProgress,
  todayInZone,
  workBlocks,
  type DoneDays,
  type HydratedPlan,
} from '@/lib/plan/plan-view'

type Props = {
  saved: { plan: HydratedPlan; done: DoneDays } | null
  examDate: string | null
  /** Evidence keys from loadPlanEvidence — blocks the student has marked. */
  evidence?: string[]
}

/**
 * Today's blocks from the study plan on the dashboard home — or, without a
 * plan, the offer to build one. Server-rendered; the ticking happens on the
 * plan page itself.
 */
export function TodayPlanCard({ saved, examDate, evidence = [] }: Props) {
  const evidenceSet = new Set(evidence)
  // The student's date, not the server's: a plan built in Karachi is read in Karachi.
  const todayIso = todayInZone(saved?.plan.timeZone)
  const today = saved ? findPlanDay(saved.plan, todayIso) : null
  // The exam date lives on the profile; a plan built for another date is
  // stale however many days it still has.
  const examMoved = Boolean(saved && examDate && examDate !== saved.plan.examDate)

  if (saved && today && !examMoved) {
    const progress = planProgress(saved.plan, saved.done, todayIso)
    const blocks = workBlocks(today).slice(0, 4)
    const done = saved.done[String(today.day)] === true
    const marked = markedBlocks(today, evidenceSet)
    return (
      <section className="ms-insight-hero ms-plan-card mb-6" aria-labelledby="dash-plan-title">
        <div className="ms-insight-hero__meta mb-3">
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            {today.day}
          </span>
          <p className="ec-eyebrow mb-0">
            Today&apos;s plan · {today.daysLeft} {today.daysLeft === 1 ? 'day' : 'days'} to go
          </p>
        </div>
        <h2 id="dash-plan-title" className="text-title" style={{ margin: 0 }}>
          {today.focus}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--ec-text-secondary)]">
          {done ? 'Ticked off. ' : marked.marked > 0 ? `${marked.marked} of ${marked.total} marked. ` : ''}
          {checkinLine(today, progress)}
        </p>
        {blocks.length > 0 ? (
          <ul className="ms-plan-blocks mt-4">
            {blocks.map((b, i) => {
              const key = blockEvidenceKey(b)
              const isMarked = Boolean(key && evidenceSet.has(key))
              return (
              <li key={i} className={`ms-plan-block ms-plan-block--${b.kind} ${isMarked ? 'is-marked' : ''}`}>
                {b.href ? (
                  <LoadingLink href={b.href} variant="inline" className="ms-plan-block__link">
                    <span className="ms-plan-block__min">{b.minutes}′</span>
                    <span className="ms-plan-block__body">
                      <span className="ms-plan-block__label">{b.label}</span>
                      {b.resourceLabel ? <span className="ms-plan-block__res">{b.resourceLabel}</span> : null}
                    </span>
                    {isMarked ? <span className="ms-plan-block__done">✓ marked</span> : <span className="ms-plan-block__go" aria-hidden>→</span>}
                  </LoadingLink>
                ) : (
                  <span className="ms-plan-block__link">
                    <span className="ms-plan-block__min">{b.minutes}′</span>
                    <span className="ms-plan-block__body">
                      <span className="ms-plan-block__label">{b.label}</span>
                    </span>
                  </span>
                )}
              </li>
              )
            })}
          </ul>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <LoadingLink
            href="/dashboard/plan"
            variant="inline"
            className="inline-flex min-h-[44px] items-center px-1 text-sm font-medium text-[var(--ec-text-secondary)] underline-offset-4 transition-colors hover:text-[var(--ec-brand)] hover:underline"
          >
            {today.workMinutes > 0 ? `Open the full plan · ${formatMinutes(today.workMinutes)} today` : 'Open the full plan'}
          </LoadingLink>
        </div>
      </section>
    )
  }

  const countdown = examCountdown(examDate)
  if (countdown.kind === 'past') return null

  const days = countdown.kind === 'future' ? countdown.daysLeft : null
  return (
    <section className="ec-card ec-card--paper ms-plan-offer mb-6" aria-labelledby="dash-plan-offer-title">
      <p className="ec-eyebrow mb-1">{saved ? 'Study plan' : 'New'}</p>
      <h2 id="dash-plan-offer-title" className="text-title" style={{ margin: 0 }}>
        {examMoved && examDate
          ? `Your exam date moved to ${formatPlanDate(examDate)}. Rebuild your plan.`
          : saved
            ? 'Your plan needs rebuilding from today.'
            : days && days > 0
            ? `${days} ${days === 1 ? 'day' : 'days'} to go. Get every one of them planned.`
            : 'Get every day to your exam planned.'}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--ec-text-secondary)]">
        Tell it your exam date, your subjects and the days you can&apos;t study. It lays out each day —
        the topics that come up most, timed papers, breaks — pointing at real questions.
      </p>
      <div className="mt-4">
        <LoadingLink
          href="/dashboard/plan"
          variant="button"
          loadingText="Opening…"
          className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center px-5 text-sm"
        >
          {saved ? 'Rebuild my plan' : 'Build my plan'}
        </LoadingLink>
      </div>
    </section>
  )
}
