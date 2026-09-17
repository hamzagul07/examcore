import { LoadingLink } from '@/components/ui/LoadingLink'
import { examCountdown } from '@/lib/dashboard/exam-date'
import { formatMinutes, formatPlanDate, planOutdated, todayInZone, type DoneDays, type HydratedPlan } from '@/lib/plan/plan-view'
import { MIN_BUFFER_MINUTES, TASK_CATEGORY_LABEL, type TaskState } from '@/lib/plan/roadmap-types'
import {
  heroFor,
  nearestExam,
  normaliseRoadmap,
  openTasks,
  studiedDaysLine,
  taskMinutes,
} from '@/lib/plan/roadmap-view'
import { countdownLine, heroCopy } from '@/components/plan/roadmap/hero-copy'
import { nowMinuteInZone } from '@/components/plan/roadmap/zone-clock'

type Props = {
  saved: { plan: HydratedPlan; done: DoneDays; taskState?: TaskState } | null
  examDate: string | null
  /** Evidence keys from loadPlanEvidence — blocks the student has marked. */
  evidence?: string[]
}

const NEXT_ROWS = 3

/**
 * The roadmap's hero on the dashboard home — the same card the roadmap
 * screen leads with, rendered on the server and static: no sheets, no
 * ticking clock. Start opens the task; "Why this?" opens the roadmap with
 * the sheet already up (?task=&why=1). Without a plan, the offer to build
 * one; with the exam date moved, the offer to rebuild.
 *
 * An outdated plan still shows today. The old gate sent every v2 student
 * to a rebuild card instead of their day; now the day renders and one line
 * says what a rebuild would add.
 */
export function TodayPlanCard({ saved, examDate, evidence = [] }: Props) {
  const evidenceSet = new Set(evidence)
  // The student's date and clock, not the server's: a plan built in Karachi is read in Karachi.
  const todayIso = todayInZone(saved?.plan.timeZone)
  const plan = saved ? normaliseRoadmap(saved.plan) : null
  const today = plan ? (plan.days.find((d) => d.date === todayIso) ?? null) : null
  // The exam date lives on the profile; a plan built for another date is
  // stale however many days it still has.
  const examMoved = Boolean(saved && examDate && examDate !== saved.plan.examDate)
  const outdated = Boolean(saved && planOutdated(saved.plan))

  if (saved && plan && today && !examMoved) {
    const state = saved.taskState ?? {}
    const nowMinute = nowMinuteInZone(plan.timeZone)
    const hero = heroFor(plan, today, state, evidenceSet, nowMinute)
    const studied = studiedDaysLine(plan, state, evidenceSet, saved.done, todayIso)
    const copy = heroCopy(hero, { plan, day: today, todayIso, studiedLine: studied })
    const nearest = nearestExam(plan, todayIso)
    const heroTask = hero.kind === 'task' ? hero.task : null
    const next = openTasks(today, state, evidenceSet)
      .filter((t) => t.id !== heroTask?.id)
      .slice(0, NEXT_ROWS)
    const inHand = Math.max(today.bufferMinutes, today.blocks.find((b) => b.kind === 'buffer')?.minutes ?? 0)
    const whyHref = heroTask ? `/dashboard/plan?task=${encodeURIComponent(heroTask.id)}&why=1` : null

    return (
      <section className={`ms-insight-hero ms-plan-card ms-rm-hero ms-rm-hero--${hero.kind} mb-6`} aria-labelledby="dash-plan-title">
        <div className="ms-insight-hero__meta mb-3">
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            {today.day}
          </span>
          <p className="ec-eyebrow mb-0">{countdownLine(nearest)}</p>
        </div>
        {hero.kind === 'task' ? <p className="ms-rm-hero__lead">{copy.eyebrow}</p> : null}
        <h2 id="dash-plan-title" className="ms-rm-hero__title">
          {copy.title}
        </h2>
        {copy.subtitle ? <p className="ms-rm-hero__sub">{copy.subtitle}</p> : null}
        {copy.chips.length > 0 ? (
          <ul className="ms-rm-chips" aria-label="Why this task">
            {copy.chips.map((c) => (
              <li key={c} className="ms-rm-chip">
                {c}
              </li>
            ))}
          </ul>
        ) : null}

        {heroTask ? (
          <div className="ms-rm-actions ms-rm-hero__actions">
            {heroTask.href ? (
              <LoadingLink href={heroTask.href} variant="button" loadingText="Opening…" className="ec-btn-primary ms-rm-btn ms-rm-btn--primary">
                Start focus block
              </LoadingLink>
            ) : null}
            {whyHref ? (
              <LoadingLink href={whyHref} variant="inline" className="ms-rm-btn ms-rm-btn--link">
                Why this?
              </LoadingLink>
            ) : null}
          </div>
        ) : null}

        {next.length > 0 ? (
          <ol className="ms-rm-next" aria-label="Then">
            {next.map((t) => (
              <li key={t.id} className={`ms-rm-next__row ms-rm-row--${t.category}`}>
                {t.startsAt ? <span className="ms-rm-time">{t.startsAt}</span> : null}
                <span className={`ms-rm-tag ms-rm-tag--${t.category}`}>{TASK_CATEGORY_LABEL[t.category]}</span>
                <span className="ms-rm-next__objective">{t.objective}</span>
                <span className="ms-rm-next__min">{taskMinutes(t, state)} min</span>
              </li>
            ))}
          </ol>
        ) : null}

        <div className="ms-rm-hero__foot">
          <LoadingLink href="/dashboard/plan" variant="inline" className="ms-rm-hero__open">
            {today.workMinutes > 0 ? `Open your roadmap · ${formatMinutes(today.workMinutes)} today` : 'Open your roadmap'}
          </LoadingLink>
          {inHand >= MIN_BUFFER_MINUTES ? <span className="ms-rm-day__hand">about {inHand} min in hand</span> : null}
        </div>
        {copy.note ? <p className="ms-plan-tomorrow">{copy.note}</p> : null}
        {outdated ? (
          <p className="ms-plan-note ms-rm-note mt-3">
            Your plan can now be placed by the hour —{' '}
            <LoadingLink href="/dashboard/plan" variant="inline" className="ms-plan-linkbtn">
              rebuild it
            </LoadingLink>
            ; your ticks stay.
          </p>
        ) : null}
      </section>
    )
  }

  const countdown = examCountdown(examDate)
  if (countdown.kind === 'past') return null

  const days = countdown.kind === 'future' ? countdown.daysLeft : null
  return (
    <section className="ec-card ec-card--paper ms-plan-offer mb-6" aria-labelledby="dash-plan-offer-title">
      <p className="ec-eyebrow mb-1">{saved ? 'Exam roadmap' : 'New'}</p>
      <h2 id="dash-plan-offer-title" className="text-title" style={{ margin: 0 }}>
        {examMoved && examDate
          ? `Your exam date moved to ${formatPlanDate(examDate)}. Rebuild your roadmap.`
          : saved
            ? 'Your roadmap needs rebuilding from today.'
            : days && days > 0
              ? `${days} ${days === 1 ? 'day' : 'days'} to go. Get every one of them planned.`
              : 'Get every day to your exam planned.'}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--ec-text-secondary)]">
        Your exam dates, your subjects, and the hours you really have. Every day is laid out around your
        commitments — with a reason for each task, and a plan that adjusts when a day slips.
      </p>
      <div className="mt-4">
        <LoadingLink
          href="/dashboard/plan"
          variant="button"
          loadingText="Opening…"
          className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center px-5 text-sm"
        >
          {saved ? 'Rebuild my roadmap' : 'Build my roadmap'}
        </LoadingLink>
      </div>
    </section>
  )
}
