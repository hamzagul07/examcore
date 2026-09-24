import { LoadingLink } from '@/components/ui/LoadingLink'
import { examCountdown } from '@/lib/dashboard/exam-date'
import type { RoadmapNextTask } from '@/lib/dashboard/next-action'
import { formatMinutes, formatPlanDate, planOutdated, todayInZone, type DoneDays, type HydratedPlan } from '@/lib/plan/plan-view'
import { MIN_BUFFER_MINUTES, TASK_CATEGORY_LABEL, type TaskState } from '@/lib/plan/roadmap-types'
import {
  heroFor,
  nearestExam,
  normaliseRoadmap,
  openTasks,
  studiedDaysLine,
  taskMinutes,
  type Hero,
  type RoadmapDay,
  type RoadmapPlan,
  yesterdayLine,
} from '@/lib/plan/roadmap-view'
import { countdownLine, heroCopy } from '@/components/plan/roadmap/hero-copy'
import { nowMinuteInZone } from '@/components/plan/roadmap/zone-clock'

type Saved = { plan: HydratedPlan; done: DoneDays; taskState?: TaskState }

type Props = {
  saved: Saved | null
  examDate: string | null
  /** Evidence keys from loadPlanEvidence — blocks the student has marked. */
  evidence?: string[]
}

const NEXT_ROWS = 3

type PlanReading = {
  plan: RoadmapPlan
  today: RoadmapDay
  todayIso: string
  nowMinute: number
  state: TaskState
  hero: Hero
}

/**
 * The plan as the dashboard reads it: today in the plan's zone, the hero
 * decision, the task state. Null when there is no plan, today is not on it,
 * or the exam date moved (the card offers a rebuild instead). One reading
 * serves both the card and the page's next-action, so they cannot disagree
 * about which task is next.
 */
function readPlan(saved: Saved | null, examDate: string | null, evidence: ReadonlySet<string>): PlanReading | null {
  if (!saved) return null
  // The student's date and clock, not the server's: a plan built in Karachi is read in Karachi.
  const todayIso = todayInZone(saved.plan.timeZone)
  const plan = normaliseRoadmap(saved.plan)
  const today = plan.days.find((d) => d.date === todayIso) ?? null
  // The exam date lives on the profile; a plan built for another date is
  // stale however many days it still has.
  if (!today || (examDate && examDate !== saved.plan.examDate)) return null
  const state = saved.taskState ?? {}
  const nowMinute = nowMinuteInZone(plan.timeZone)
  return { plan, today, todayIso, nowMinute, state, hero: heroFor(plan, today, state, evidence, nowMinute) }
}

function whyHrefFor(taskId: string): string {
  return `/dashboard/plan?task=${encodeURIComponent(taskId)}&why=1`
}


/**
 * The roadmap's next task for the dashboard's next-action, or null when the
 * hero is not a task (no plan, day done, no time left, rest day) or the
 * task has nowhere to open. The page feeds it to buildNextAction so the
 * roadmap's task is the one next thing, and renders this card as the hero.
 */
export function roadmapNextTask(saved: Saved | null, examDate: string | null, evidence: string[] = []): RoadmapNextTask | null {
  const read = readPlan(saved, examDate, new Set(evidence))
  if (!read || read.hero.kind !== 'task') return null
  const { task, minutes } = read.hero
  const href = task.href
  if (!href) return null
  return { id: task.id, objective: task.objective, href, minutes, dayNumber: read.today.day, whyHref: whyHrefFor(task.id) }
}

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
  const examMoved = Boolean(saved && examDate && examDate !== saved.plan.examDate)
  const outdated = Boolean(saved && planOutdated(saved.plan))
  const read = readPlan(saved, examDate, evidenceSet)

  if (saved && read) {
    const { plan, today, todayIso, state, hero } = read
    const studied = studiedDaysLine(plan, state, evidenceSet, saved.done, todayIso)
    const copy = heroCopy(hero, { plan, day: today, todayIso, studiedLine: studied })
    const nearest = nearestExam(plan, todayIso)
    const heroTask = hero.kind === 'task' ? hero.task : null
    const next = openTasks(today, state, evidenceSet)
      .filter((t) => t.id !== heroTask?.id)
      .slice(0, NEXT_ROWS)
    const inHand = Math.max(today.bufferMinutes, today.blocks.find((b) => b.kind === 'buffer')?.minutes ?? 0)
    const whyHref = heroTask ? whyHrefFor(heroTask.id) : null
    const yesterday = yesterdayLine(plan, state, evidenceSet, todayIso)

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

        {yesterday ? (
          <p className="ms-plan-note ms-rm-hero__yesterday">
            {yesterday.when}: {yesterday.done} of {yesterday.total} done.{' '}
            <LoadingLink href="/dashboard/plan?history=1" variant="inline" className="ms-plan-linkbtn">
              The rest is in your history
            </LoadingLink>
            , ready to carry over.
          </p>
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
