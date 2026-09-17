'use client'

import { useState } from 'react'
import { PLAN_VERSION, PLAN_VERSION_NOTES } from '@/lib/plan/build-study-plan'
import { formatMinutes, formatPlanDate, planOutdated, type DoneDays } from '@/lib/plan/plan-view'
import { MIN_BUFFER_MINUTES, type TaskState } from '@/lib/plan/roadmap-types'
import {
  dayCompleteFromTasks,
  taskMinutes,
  taskStanding,
  upcomingDays,
  workTasks,
  type RoadmapDay,
  type RoadmapPlan,
  type RoadmapTask,
} from '@/lib/plan/roadmap-view'
import { TaskCard } from '@/components/plan/roadmap/TaskCard'

type Props = {
  plan: RoadmapPlan
  state: TaskState
  evidence: ReadonlySet<string>
  done: DoneDays
  todayIso: string
  onAdjust: () => void
  onOpen: (task: RoadmapTask) => void
  onDone: (task: RoadmapTask) => void
  busyId?: string | null
}

/**
 * The Roadmap tab: the next four days in full, everything after them as
 * one milestone row each, and the exam dates at the end. Past days hide
 * behind a toggle so day fifteen does not open on fourteen finished ones.
 * No progress bar and no tally: the day cards say what each day holds, and
 * a tick on a past row is a fact about that day, not a score.
 */
export function RoadmapTimeline({ plan, state, evidence, done, todayIso, onAdjust, onOpen, onDone, busyId = null }: Props) {
  const [showPast, setShowPast] = useState(false)
  const { detailed, later } = upcomingDays(plan, todayIso, 4)
  const past = plan.days.filter((d) => d.date < todayIso)
  const outdated = planOutdated(plan)
  const exams = [...plan.exams].sort((a, b) => (a.examDate < b.examDate ? -1 : a.examDate > b.examDate ? 1 : 0))
  const examDates = new Set(exams.map((e) => e.examDate))

  return (
    <div className="ms-rm-roadmap">
      <div className="ms-plan-actions mb-4">
        <button type="button" className="ec-pill" onClick={onAdjust}>
          Adjust plan
        </button>
        <a href="/api/plan/calendar" className="ec-pill" download="markscheme-study-plan.ics">
          Add to calendar
        </a>
      </div>

      {outdated ? (
        <p className="ms-plan-note ms-rm-note mb-4" role="status">
          The planner has improved since this plan was built — {PLAN_VERSION_NOTES[PLAN_VERSION]}. Your ticks stay.{' '}
          <button type="button" className="ms-plan-linkbtn" onClick={onAdjust}>
            Rebuild it now
          </button>
          .
        </p>
      ) : null}

      {past.length > 0 ? (
        <button
          type="button"
          className="ms-plan-past-toggle mb-4"
          onClick={() => setShowPast((s) => !s)}
          aria-expanded={showPast}
          aria-controls="rm-past-days"
        >
          {showPast ? 'Hide the days before today' : `Show the ${past.length} ${past.length === 1 ? 'day' : 'days'} before today`}
        </button>
      ) : null}
      {showPast ? (
        <ol id="rm-past-days" className="ms-rm-milestones mb-6" aria-label="Days before today">
          {past.map((d) => (
            <MilestoneRow key={d.day} day={d} exam={examDates.has(d.date)} done={done[String(d.day)] === true || dayCompleteFromTasks(d, state, evidence)} />
          ))}
        </ol>
      ) : null}

      {detailed.length > 0 ? (
        <section aria-label="The next few days" className="mb-6">
          <h3 className="ms-rm-section">Next up</h3>
          <ol className="ms-rm-daycards">
            {detailed.map((d, i) => (
              <DayCard
                key={d.day}
                day={d}
                heading={i === 0 && isTomorrow(todayIso, d.date) ? 'Tomorrow' : formatPlanDate(d.date)}
                state={state}
                evidence={evidence}
                onOpen={onOpen}
                onDone={onDone}
                busyId={busyId}
                open={i === 0}
              />
            ))}
          </ol>
        </section>
      ) : null}

      {later.length > 0 ? (
        <section aria-label="Later" className="mb-6">
          <h3 className="ms-rm-section">Then</h3>
          <ol className="ms-rm-milestones">
            {later.map((d) => (
              <MilestoneRow key={d.day} day={d} exam={examDates.has(d.date)} />
            ))}
          </ol>
        </section>
      ) : null}

      <section aria-label="Exam dates" className="ms-rm-exams">
        <h3 className="ms-rm-section">Exam dates</h3>
        <ul className="ms-rm-examlist">
          {exams.map((e, i) => (
            <li key={`${e.subjectCode}-${e.examDate}-${i}`} className={`ms-rm-exam${e.examDate < todayIso ? ' is-past' : ''}`}>
              <span className="ms-rm-exam__date">{formatPlanDate(e.examDate)}</span>
              <span className="ms-rm-exam__label">
                {e.label}
                {e.component ? ` ${e.component}` : ''}
              </span>
              {e.examTime ? <span className="ms-rm-exam__time">{e.examTime}</span> : null}
            </li>
          ))}
        </ul>
        <p className="ms-plan-note mt-3">Sleep the night before; the plan stops on purpose.</p>
      </section>
    </div>
  )
}

function isTomorrow(todayIso: string, date: string): boolean {
  const next = new Date(`${todayIso}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10) === date
}

function subjectFocus(day: RoadmapDay): string {
  const work = workTasks(day)
  if (work.length === 0) return day.kind === 'exam' ? 'Exam' : day.kind === 'rest' ? 'Rest day' : day.focus
  const subjects = [...new Set(work.map((t) => t.subjectLabel).filter((s): s is string => Boolean(s)))]
  return subjects.length ? subjects.join(' · ') : day.focus
}

function DayCard({
  day,
  heading,
  state,
  evidence,
  onOpen,
  onDone,
  busyId,
  open,
}: {
  day: RoadmapDay
  heading: string
  state: TaskState
  evidence: ReadonlySet<string>
  onOpen: (task: RoadmapTask) => void
  onDone: (task: RoadmapTask) => void
  busyId: string | null
  open: boolean
}) {
  const work = workTasks(day)
  const withTime = work.some((t) => Boolean(t.startsAt))
  return (
    <li className={`ms-rm-daycard ms-rm-daycard--${day.kind}`}>
      <div className="ms-rm-daycard__head">
        <span className="ms-rm-daycard__date">{heading}</span>
        <span className="ms-rm-daycard__num">Day {day.day}</span>
        {day.workMinutes > 0 ? (
          <span className="ms-rm-daycard__mins">{formatMinutes(day.workMinutes)}</span>
        ) : (
          <span className="ms-rm-daycard__mins">{day.kind === 'exam' ? 'exam' : 'rest'}</span>
        )}
        {day.bufferMinutes >= MIN_BUFFER_MINUTES ? <span className="ms-rm-day__hand">about {day.bufferMinutes} min in hand</span> : null}
      </div>
      <p className="ms-rm-daycard__focus">{day.focus}</p>
      {day.commitments.length > 0 ? (
        <ul className="ms-rm-daycard__commitments" aria-label="Commitments">
          {day.commitments.map((c, i) => (
            <li key={i} className={`ms-rm-commitment${c.kind === 'exam' ? ' is-exam' : ''}`}>
              {c.label}
              <span className="ms-rm-commitment__when"> · {c.start}–{c.end}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {work.length > 0 ? (
        <details className="ms-plan-day__details" open={open}>
          <summary className="ms-plan-day__summary">
            {work.length} {work.length === 1 ? 'task' : 'tasks'}
          </summary>
          <ol className={`ms-rm-rows${withTime ? ' ms-rm-rows--timed' : ''}`}>
            {work.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                standing={taskStanding(t, state, evidence)}
                entry={state[t.id]}
                minutes={taskMinutes(t, state)}
                withTime={withTime}
                onOpen={onOpen}
                onDone={onDone}
                busy={busyId === t.id}
                compact
              />
            ))}
          </ol>
        </details>
      ) : null}
    </li>
  )
}

function MilestoneRow({ day, exam, done = false }: { day: RoadmapDay; exam: boolean; done?: boolean }) {
  return (
    <li className={`ms-rm-milestone ms-rm-milestone--${day.kind}${done ? ' is-done' : ''}`}>
      <span className="ms-rm-milestone__date">{formatPlanDate(day.date)}</span>
      <span className="ms-rm-milestone__focus">{subjectFocus(day)}</span>
      <span className="ms-rm-milestone__mins">{day.workMinutes > 0 ? formatMinutes(day.workMinutes) : ''}</span>
      {exam || day.kind === 'exam' ? <span className="ms-rm-milestone__exam">exam</span> : null}
      {done ? (
        <span className="ms-rm-milestone__done" aria-label="Studied">
          ✓
        </span>
      ) : null}
    </li>
  )
}
