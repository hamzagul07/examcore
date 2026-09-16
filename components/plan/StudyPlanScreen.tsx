'use client'

import { useEffect, useMemo, useState } from 'react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Button } from '@/components/ui/Button'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { ErrorBox } from '@/components/AuthFormBits'
import { suggestedExamDates } from '@/lib/dashboard/exam-date'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
import {
  DEFAULT_MINUTES_PER_DAY,
  PREPAREDNESS_BLURB,
  PREPAREDNESS_LABEL,
  planLength,
  type Preparedness,
  type WeekAvailability,
} from '@/lib/plan/build-study-plan'
import {
  blockEvidenceKey,
  checkinLine,
  findPlanDay,
  formatMinutes,
  formatPlanDate,
  isoDate,
  markedBlocks,
  planProgress,
  todayInZone,
  type DoneDays,
  type HydratedBlock,
  type HydratedDay,
  type HydratedPlan,
} from '@/lib/plan/plan-view'

type Saved = { plan: HydratedPlan; done: DoneDays }
type SubjectOption = { code: string; label: string }

type Props = {
  initial: Saved | null
  /** Evidence keys (see blockEvidenceKey) for questions marked since the plan was built. */
  evidence: string[]
  firstName: string
  subjectOptions: SubjectOption[]
  defaults: { examDate: string | null; subjectCodes: string[]; remindMe: boolean }
}

/** How much of the daily budget each weekday gets. Tuition → none. */
type DayLoad = 'full' | 'half' | 'short' | 'none'
const DAY_LOAD_LABEL: Record<DayLoad, string> = {
  full: 'Full',
  half: 'Half',
  short: '30 min',
  none: 'None',
}
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const MINUTE_OPTIONS = ['45', '60', '90', '120', '180'] as const
const MAX_SUBJECTS = 4
const MAX_BLOCKED_DATES = 60
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

function loadToMinutes(load: DayLoad, minutesPerDay: number): number {
  if (load === 'none') return 0
  if (load === 'short') return 30
  if (load === 'half') return Math.max(25, Math.round(minutesPerDay / 2 / 5) * 5)
  return minutesPerDay
}

function minutesToLoad(minutes: number, minutesPerDay: number): DayLoad {
  if (minutes <= 0) return 'none'
  if (minutes <= 30) return 'short'
  if (minutes < minutesPerDay) return 'half'
  return 'full'
}

export function StudyPlanScreen({ initial, evidence, firstName, subjectOptions, defaults }: Props) {
  const [saved, setSaved] = useState<Saved | null>(initial)
  const [mode, setMode] = useState<'view' | 'build'>(initial ? 'view' : 'build')

  // Opened from the morning email: count it, then drop the marker from the URL.
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      if (sp.get('src') !== 'checkin') return
      trackFunnelEvent('plan_checkin_opened')
      sp.delete('src')
      const q = sp.toString()
      window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''))
    } catch {
      /* ignore */
    }
  }, [])

  return mode === 'view' && saved ? (
    <Roadmap
      saved={saved}
      evidence={evidence}
      firstName={firstName}
      profileExamDate={defaults.examDate}
      onTick={(done) => setSaved({ plan: saved.plan, done })}
      onAdjust={() => setMode('build')}
    />
  ) : (
    <Builder
      saved={saved}
      subjectOptions={subjectOptions}
      defaults={defaults}
      onBuilt={(next) => {
        setSaved(next)
        setMode('view')
        window.scrollTo({ top: 0 })
      }}
      onCancel={saved ? () => setMode('view') : undefined}
    />
  )
}

// --- builder -------------------------------------------------------------------

function Builder({
  saved,
  subjectOptions,
  defaults,
  onBuilt,
  onCancel,
}: {
  saved: Saved | null
  subjectOptions: SubjectOption[]
  defaults: Props['defaults']
  onBuilt: (next: Saved) => void
  onCancel?: () => void
}) {
  const prior = saved?.plan ?? null
  const [examDate, setExamDate] = useState(prior?.examDate ?? defaults.examDate ?? '')
  const [subjects, setSubjects] = useState<string[]>(
    prior?.subjects.map((s) => s.code) ?? defaults.subjectCodes.slice(0, MAX_SUBJECTS)
  )
  const [preparedness, setPreparedness] = useState<Preparedness>(prior?.preparedness ?? 'secure')
  const [minutes, setMinutes] = useState<(typeof MINUTE_OPTIONS)[number]>(
    (MINUTE_OPTIONS.find((m) => Number(m) === prior?.minutesPerDay) ?? String(DEFAULT_MINUTES_PER_DAY)) as (typeof MINUTE_OPTIONS)[number]
  )
  const [loads, setLoads] = useState<DayLoad[]>(() =>
    prior
      ? prior.availability.map((m) => minutesToLoad(m, prior.minutesPerDay))
      : ['full', 'full', 'full', 'full', 'full', 'full', 'full']
  )
  const [blockedDates, setBlockedDates] = useState<string[]>(prior?.blockedDates ?? [])
  const [blockInput, setBlockInput] = useState('')
  const [remindMe, setRemindMe] = useState(defaults.remindMe)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const minutesPerDay = Number(minutes)
  // Rendered on the server too, so start from the UTC date both sides agree
  // on and switch to the browser's own date once mounted.
  const [todayIso, setTodayIso] = useState(() => isoDate(new Date()))
  useEffect(() => {
    setTodayIso(isoDate(new Date(), true))
  }, [])
  const daysLeft = examDate ? planLength(todayIso, examDate) : 0
  const suggestions = useMemo(() => suggestedExamDates(), [])

  function addBlockedDate() {
    const d = blockInput
    if (!ISO_DATE.test(d) || blockedDates.includes(d) || blockedDates.length >= MAX_BLOCKED_DATES) return
    setBlockedDates([...blockedDates, d].sort())
    setBlockInput('')
  }

  function toggleSubject(code: string) {
    setSubjects((cur) =>
      cur.includes(code) ? cur.filter((c) => c !== code) : cur.length >= MAX_SUBJECTS ? cur : [...cur, code]
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!examDate) return setError('Pick your exam date.')
    if (daysLeft === 0) return setError('Your exam date needs to be after today.')
    if (subjects.length === 0) return setError('Pick at least one subject.')
    const availability = loads.map((l) => loadToMinutes(l, minutesPerDay)) as WeekAvailability
    if (availability.every((m) => m === 0)) return setError('Every day is set to none — free up at least one.')

    setBusy(true)
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examDate,
          startDate: todayIso,
          preparedness,
          minutesPerDay,
          availability,
          subjects,
          timeZone: browserTimeZone(),
          blockedDates,
          remindMe,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as Partial<Saved> & { error?: string }
      if (!res.ok || !data.plan) {
        setError(data.error || "We couldn't build your plan just now. Try again in a moment.")
        return
      }
      trackFunnelEvent('plan_built', { subject: subjects[0] ?? null })
      onBuilt({ plan: data.plan, done: data.done ?? {} })
    } catch {
      setError('Network error — check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="ms-plan-form" noValidate>
      <header className="mb-8">
        <p className="ec-eyebrow">Study plan</p>
        <h1 className="text-hero" style={{ marginBottom: 8 }}>
          {prior ? 'Adjust your plan' : 'A plan to the exam, day by day'}
        </h1>
        <p className="text-body max-w-prose text-[var(--ec-text-secondary)]">
          Exam date, subjects, how you feel about it, and the days you can&apos;t study. You get
          every day from now to the exam laid out — breaks included — pointing at real questions.
        </p>
      </header>

      {/* Exam date */}
      <fieldset className="ms-plan-fieldset">
        <legend className="label-overline">Exam date</legend>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s.value}
              type="button"
              disabled={busy}
              onClick={() => setExamDate(s.value)}
              className={`ec-pill ${examDate === s.value ? 'is-on' : ''}`}
              aria-pressed={examDate === s.value}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label htmlFor="plan-exam-date" className="text-caption">
            Or the exact date
          </label>
          <input
            id="plan-exam-date"
            type="date"
            className="ec-input"
            value={examDate}
            min={todayIso}
            onChange={(e) => setExamDate(e.target.value)}
            disabled={busy}
          />
          {examDate ? (
            <span className="ms-plan-countdown" aria-live="polite">
              {daysLeft > 1 ? `${daysLeft} days to go` : daysLeft === 1 ? 'Tomorrow' : 'That date has passed'}
            </span>
          ) : null}
        </div>
      </fieldset>

      {/* Subjects */}
      <fieldset className="ms-plan-fieldset">
        <legend className="label-overline">Subjects on this exam run</legend>
        <p className="text-caption mb-2">Up to {MAX_SUBJECTS}. The plan rotates them so none goes cold.</p>
        <div className="flex flex-wrap gap-2">
          {subjectOptions.map((s) => {
            const on = subjects.includes(s.code)
            const full = !on && subjects.length >= MAX_SUBJECTS
            return (
              <button
                key={s.code}
                type="button"
                disabled={busy || full}
                onClick={() => toggleSubject(s.code)}
                className={`ec-pill ${on ? 'is-on' : ''}`}
                aria-pressed={on}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Preparedness */}
      <fieldset className="ms-plan-fieldset">
        <legend className="label-overline" id="plan-prep-label">
          Honestly, where are you?
        </legend>
        <SegmentedControl<Preparedness>
          value={preparedness}
          onChange={setPreparedness}
          aria-labelledby="plan-prep-label"
          className="ms-plan-segments"
          optionClassName="ms-plan-segment"
          disabled={busy}
          options={(['pass', 'secure', 'stretch'] as Preparedness[]).map((p) => ({
            value: p,
            label: PREPAREDNESS_LABEL[p],
          }))}
        />
        <p className="text-caption mt-2 max-w-prose">{PREPAREDNESS_BLURB[preparedness]}</p>
      </fieldset>

      {/* Time */}
      <fieldset className="ms-plan-fieldset">
        <legend className="label-overline" id="plan-minutes-label">
          Minutes a day, on a normal day
        </legend>
        <SegmentedControl<(typeof MINUTE_OPTIONS)[number]>
          value={minutes}
          onChange={setMinutes}
          aria-labelledby="plan-minutes-label"
          className="ms-plan-segments"
          optionClassName="ms-plan-segment"
          disabled={busy}
          options={MINUTE_OPTIONS.map((m) => ({ value: m, label: formatMinutes(Number(m)) }))}
        />
        <p className="text-caption mt-2">
          Focused blocks of 25 with 5 off, a longer break after four. Ninety minutes is three real blocks.
        </p>
      </fieldset>

      {/* Week */}
      <fieldset className="ms-plan-fieldset">
        <legend className="label-overline">Your week</legend>
        <p className="text-caption mb-3">
          Tuition on Tuesdays, football on Saturday? Set those to None or Half — the plan works around
          them rather than pretending.
        </p>
        <div className="ms-plan-week" role="group" aria-label="Minutes available each weekday">
          {WEEKDAYS.map((label, i) => (
            <label key={label} className="ms-plan-week__day">
              <span className="ms-plan-week__name">{label}</span>
              <select
                className="ms-plan-week__select"
                value={loads[i]}
                disabled={busy}
                onChange={(e) => {
                  const next = [...loads]
                  next[i] = e.target.value as DayLoad
                  setLoads(next)
                }}
                aria-label={`${label}: how much of your daily time`}
              >
                {(Object.keys(DAY_LOAD_LABEL) as DayLoad[]).map((l) => (
                  <option key={l} value={l}>
                    {DAY_LOAD_LABEL[l]}
                  </option>
                ))}
              </select>
              <span className="ms-plan-week__min">{loadToMinutes(loads[i]!, minutesPerDay) || '—'}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Days away */}
      <fieldset className="ms-plan-fieldset">
        <legend className="label-overline">Days you&apos;re away</legend>
        <p className="text-caption mb-3">
          A trip, a wedding, a school event. Nothing gets scheduled on those days and the plan
          works around them.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className="ec-input"
            value={blockInput}
            min={todayIso}
            max={examDate || undefined}
            onChange={(e) => setBlockInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addBlockedDate()
              }
            }}
            aria-label="A date you're away"
            disabled={busy}
          />
          <button type="button" className="ec-pill" disabled={busy || !blockInput} onClick={addBlockedDate}>
            Add day
          </button>
        </div>
        {blockedDates.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Days away">
            {blockedDates.map((d) => (
              <li key={d}>
                <button
                  type="button"
                  className="ec-pill is-on"
                  disabled={busy}
                  onClick={() => setBlockedDates(blockedDates.filter((x) => x !== d))}
                  aria-label={`Remove ${formatPlanDate(d)}`}
                  title="Remove"
                >
                  {formatPlanDate(d)} ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </fieldset>

      {/* Check-ins */}
      <fieldset className="ms-plan-fieldset">
        <label className="ms-plan-check">
          <input
            type="checkbox"
            checked={remindMe}
            disabled={busy}
            onChange={(e) => setRemindMe(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium">Email me each morning with the day&apos;s blocks</span>
            <span className="text-caption block">
              One short email on study days, none on rest days. Switch it off any time from the email or
              your account.
            </span>
          </span>
        </label>
      </fieldset>

      {error ? <ErrorBox message={error} /> : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" size="md" isLoading={busy} loadingText="Building your plan…">
          {prior ? 'Rebuild my plan' : 'Build my plan'}
        </Button>
        {onCancel ? (
          <button type="button" className="ec-pill" onClick={onCancel} disabled={busy}>
            Keep the current plan
          </button>
        ) : null}
        {prior ? (
          <p className="text-caption">Rebuilding replaces the current plan and clears the days you&apos;ve ticked.</p>
        ) : null}
      </div>
    </form>
  )
}

// --- roadmap -------------------------------------------------------------------

function Roadmap({
  saved,
  evidence,
  firstName,
  profileExamDate,
  onTick,
  onAdjust,
}: {
  saved: Saved
  evidence: string[]
  firstName: string
  /** The exam date on the profile — the plan is stale when it differs. */
  profileExamDate: string | null
  onTick: (done: DoneDays) => void
  onAdjust: () => void
}) {
  const { plan, done } = saved
  // Server and client agree on the plan's own zone; once mounted, the
  // browser's date wins so a travelling student sees the right day.
  const [todayIso, setTodayIso] = useState(() => todayInZone(plan.timeZone))
  const [ticking, setTicking] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setTodayIso(isoDate(new Date(), true))
  }, [])

  const today = findPlanDay(plan, todayIso)
  const progress = planProgress(plan, done, todayIso)
  const examPassed = plan.examDate <= todayIso
  const examMoved = Boolean(profileExamDate && profileExamDate !== plan.examDate)
  const evidenceSet = useMemo(() => new Set(evidence), [evidence])
  // Day 15 of 30 should not start with fourteen finished days.
  const [showPast, setShowPast] = useState(false)
  const pastDays = plan.days.filter((d) => d.date < todayIso)
  const hidePast = !showPast && pastDays.length > 2

  useEffect(() => {
    if (!today || today.day <= 3) return
    document.getElementById('plan-today')?.scrollIntoView({ block: 'start' })
  }, [today])

  async function tick(day: number, next: boolean) {
    const before = done
    const optimistic = { ...done }
    if (next) optimistic[String(day)] = true
    else delete optimistic[String(day)]
    onTick(optimistic)
    setTicking(day)
    setError('')
    try {
      const res = await fetch('/api/plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, done: next }),
      })
      const data = (await res.json().catch(() => ({}))) as { done?: DoneDays; error?: string }
      if (!res.ok || !data.done) {
        onTick(before)
        setError(data.error || "Couldn't save that. Try again.")
        return
      }
      onTick(data.done)
      if (next) trackFunnelEvent('plan_day_done')
    } catch {
      onTick(before)
      setError('Network error — that tick did not save.')
    } finally {
      setTicking(null)
    }
  }

  const prepLabel = PREPAREDNESS_LABEL[plan.preparedness]

  return (
    <div className="ms-plan">
      <header className="mb-6">
        <p className="ec-eyebrow">Study plan</p>
        <h1 className="text-hero" style={{ marginBottom: 8 }}>
          {examPassed
            ? 'Your exam has been and gone.'
            : today
              ? `Day ${today.day}${firstName ? `, ${firstName}` : ''}. ${today.daysLeft} ${today.daysLeft === 1 ? 'day' : 'days'} to go.`
              : plan.headline}
        </h1>
        <p className="text-body max-w-prose text-[var(--ec-text-secondary)]">{plan.headline}</p>
        <p className="text-caption mt-2">
          {plan.subjects.map((s) => s.label).join(' · ')} · {prepLabel} · {formatMinutes(plan.minutesPerDay)} a
          day · built {formatPlanDate(plan.generatedAt.slice(0, 10))}
          {' · '}
          <button type="button" className="ms-plan-linkbtn" onClick={onAdjust}>
            Adjust
          </button>
          {' · '}
          <a href="/api/plan/calendar" className="ms-plan-linkbtn" download="markscheme-study-plan.ics">
            Add to calendar
          </a>
        </p>
      </header>

      <div className="ms-plan-progress" role="status">
        <span className="ms-plan-progress__big">{progress.totalDone}</span>
        <span className="ms-plan-progress__of">of {progress.totalWorkDays} study days done</span>
        {progress.behind > 0 ? (
          <span className="ms-plan-progress__behind">{progress.behind} slipped — that&apos;s fine, don&apos;t double up</span>
        ) : progress.done > 0 ? (
          <span className="ms-plan-progress__ok">none missed</span>
        ) : null}
      </div>

      {error ? <ErrorBox message={error} /> : null}

      {examMoved && profileExamDate ? (
        <p className="ms-plan-note ms-plan-note--warn mb-6" role="status">
          Your exam date is now <strong>{formatPlanDate(profileExamDate)}</strong>, but this plan was built for{' '}
          {formatPlanDate(plan.examDate)}.{' '}
          <button type="button" className="ms-plan-linkbtn" onClick={onAdjust}>
            Rebuild it for the new date
          </button>
          .
        </p>
      ) : null}

      {today ? (
        <section className="ms-insight-hero ms-action-card ms-plan-today mb-8" aria-labelledby="plan-today-title">
          <div className="ms-insight-hero__meta mb-2">
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              {today.day}
            </span>
            <p className="ec-eyebrow mb-0">Today · {formatPlanDate(today.date)}</p>
          </div>
          <h2 id="plan-today-title" className="text-title" style={{ margin: 0 }}>
            {today.focus}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            {checkinLine(today, progress)}
          </p>
          <BlockList blocks={today.blocks} evidence={evidenceSet} emphasis />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {today.workMinutes > 0 ? (
              <TickButton day={today} done={done[String(today.day)] === true} busy={ticking === today.day} onTick={tick} primary />
            ) : null}
          </div>
        </section>
      ) : !examPassed ? (
        <p className="ms-plan-note mb-6">
          Today isn&apos;t on this plan (it was built for {formatPlanDate(plan.days[0]?.date ?? plan.examDate)} onward).{' '}
          <button type="button" className="ms-plan-linkbtn" onClick={onAdjust}>
            Rebuild it from today
          </button>
          .
        </p>
      ) : null}

      <ol className="ms-plan-days" aria-label="Every day to the exam">
        {hidePast ? (
          <li>
            <button type="button" className="ms-plan-past-toggle" onClick={() => setShowPast(true)}>
              Show the {pastDays.length} days before today
            </button>
          </li>
        ) : null}
        {plan.days.map((d) => {
          const isToday = d.date === todayIso
          const isPast = d.date < todayIso
          const isDone = done[String(d.day)] === true
          if (isPast && hidePast) return null
          const marks = markedBlocks(d, evidenceSet)
          return (
            <li
              key={d.day}
              id={isToday ? 'plan-today' : undefined}
              className={[
                'ms-plan-day',
                `ms-plan-day--${d.kind}`,
                isToday ? 'is-today' : '',
                isPast ? 'is-past' : '',
                isDone ? 'is-done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="ms-plan-day__head">
                <span className="ms-plan-day__num">Day {d.day}</span>
                <span className="ms-plan-day__date">{formatPlanDate(d.date)}</span>
                <span className="ms-plan-day__left">{d.daysLeft === 1 ? 'exam tomorrow' : `${d.daysLeft} days left`}</span>
                {d.workMinutes > 0 ? (
                  <span className="ms-plan-day__mins">{formatMinutes(d.workMinutes)}</span>
                ) : (
                  <span className="ms-plan-day__mins">rest</span>
                )}
                {marks.marked > 0 ? (
                  <span className="ms-plan-day__marked">
                    {marks.marked}/{marks.total} marked
                  </span>
                ) : null}
                {d.workMinutes > 0 ? (
                  <TickButton day={d} done={isDone} busy={ticking === d.day} onTick={tick} />
                ) : null}
              </div>
              <p className="ms-plan-day__focus">{d.focus}</p>
              {d.workMinutes > 0 ? <BlockList blocks={d.blocks} evidence={evidenceSet} /> : null}
            </li>
          )
        })}
      </ol>

      <p className="ms-plan-note mt-8">
        Exam day: <strong>{formatPlanDate(plan.examDate)}</strong>. Sleep the night before; the plan stops on
        purpose.
      </p>
    </div>
  )
}

function BlockList({
  blocks,
  evidence,
  emphasis = false,
}: {
  blocks: HydratedBlock[]
  evidence?: ReadonlySet<string>
  emphasis?: boolean
}) {
  return (
    <ul className={`ms-plan-blocks ${emphasis ? 'ms-plan-blocks--today' : ''}`}>
      {blocks.map((b, i) => {
        if (b.kind === 'break') {
          return (
            <li key={i} className="ms-plan-block ms-plan-block--break" aria-label={`Break, ${b.minutes} minutes`}>
              <span>{b.minutes} min off</span>
            </li>
          )
        }
        if (b.kind === 'rest') {
          return (
            <li key={i} className="ms-plan-block ms-plan-block--rest">
              {b.label}
            </li>
          )
        }
        const key = blockEvidenceKey(b)
        const isMarked = Boolean(key && evidence?.has(key))
        const body = (
          <>
            <span className="ms-plan-block__min">{b.minutes}′</span>
            <span className="ms-plan-block__body">
              <span className="ms-plan-block__label">{b.label}</span>
              {b.resourceLabel ? <span className="ms-plan-block__res">{b.resourceLabel}</span> : null}
            </span>
            {isMarked ? (
              <span className="ms-plan-block__done">✓ marked</span>
            ) : b.href ? (
              <span className="ms-plan-block__go" aria-hidden>→</span>
            ) : null}
          </>
        )
        return (
          <li key={i} className={`ms-plan-block ms-plan-block--${b.kind} ${isMarked ? 'is-marked' : ''}`}>
            {b.href ? (
              <LoadingLink href={b.href} variant="inline" className="ms-plan-block__link">
                {body}
              </LoadingLink>
            ) : (
              <span className="ms-plan-block__link">{body}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function TickButton({
  day,
  done,
  busy,
  onTick,
  primary = false,
}: {
  day: HydratedDay
  done: boolean
  busy: boolean
  onTick: (day: number, next: boolean) => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      className={`ms-plan-tick ${done ? 'is-done' : ''} ${primary ? 'ms-plan-tick--primary' : ''}`}
      aria-pressed={done}
      disabled={busy}
      onClick={() => onTick(day.day, !done)}
    >
      {done ? '✓ Done' : primary ? 'Mark today done' : 'Done'}
    </button>
  )
}
