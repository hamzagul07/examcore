'use client'

import { useState } from 'react'
import { PLAN_VERSION, PLAN_VERSION_NOTES } from '@/lib/plan/build-study-plan'
import { formatMinutes, formatPlanDate, planOutdated, type DoneDays } from '@/lib/plan/plan-view'
import { MIN_BUFFER_MINUTES, type TaskState } from '@/lib/plan/roadmap-types'
import {
  carryable,
  historyDayDone,
  historyDays,
  historyTally,
  taskMinutes,
  taskStanding,
  upcomingDays,
  workTasks,
  type HistoryDay,
  type RoadmapDay,
  type RoadmapPlan,
  type RoadmapTask,
} from '@/lib/plan/roadmap-view'
import { TaskCard } from '@/components/plan/roadmap/TaskCard'
import { historyLabel, historyTallyLine } from '@/components/plan/roadmap/labels'

type Props = {
  plan: RoadmapPlan
  state: TaskState
  evidence: ReadonlySet<string>
  done: DoneDays
  todayIso: string
  onAdjust: () => void
  onOpen: (task: RoadmapTask) => void
  onDone: (task: RoadmapTask) => void
  /** Opens the carry-over sheet for a past task that did not happen. */
  onCarry?: (task: RoadmapTask) => void
  /** Opens the carry-over sheet for every not-done task of a past day at once. */
  onCarryAll?: (tasks: RoadmapTask[]) => void
  busyId?: string | null
  /** Start with the days before today unfolded (a link straight to the history). */
  initialShowPast?: boolean
  /** Controlled: whether the days before today are unfolded, and the toggle's callback. Absent, the timeline keeps its own state. */
  showPast?: boolean
  onShowPastChange?: (open: boolean) => void
}

/**
 * The Roadmap tab: the next four days in full, everything after them as
 * one milestone row each, and the exam dates at the end. Past days hide
 * behind a toggle so day fifteen does not open on fourteen finished ones;
 * opened, each past day is a row that unfolds into its tasks — done,
 * skipped, moved, not done — with "Carry over" on anything that did not
 * happen, because "which ones did I miss" was the question students asked
 * and the one thing the milestone rows could not answer. Days kept from
 * before a rebuild sit in the same list. No progress bar: a day's count is
 * a fact about that day, not a score. A milestone
 * row shows the shape of the run-in — the exam first on its own day, then
 * the study subjects; "Timed paper" and "Review only" tags where the plan
 * changes gear — so the student can see where the paper falls and when
 * nothing new starts. Done buttons appear on today and before, never on a
 * day that has not come.
 */
export function RoadmapTimeline({
  plan,
  state,
  evidence,
  done,
  todayIso,
  onAdjust,
  onOpen,
  onDone,
  onCarry,
  onCarryAll,
  busyId = null,
  initialShowPast = false,
  showPast: showPastProp,
  onShowPastChange,
}: Props) {
  const [showPastOwn, setShowPastOwn] = useState(initialShowPast)
  const showPast = showPastProp ?? showPastOwn
  const setShowPast = (next: boolean) => {
    setShowPastOwn(next)
    onShowPastChange?.(next)
  }
  const { detailed, later } = upcomingDays(plan, todayIso, 4)
  const past = historyDays(plan, todayIso)
  const outdated = planOutdated(plan)
  const exams = [...plan.exams].sort((a, b) => (a.examDate < b.examDate ? -1 : a.examDate > b.examDate ? 1 : 0))
  const examsOn = (date: string) => exams.filter((e) => e.examDate === date).map((e) => e.label)

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
          onClick={() => setShowPast(!showPast)}
          aria-expanded={showPast}
          aria-controls="rm-past-days"
        >
          {showPast ? 'Hide the days before today' : `Show the ${past.length} ${past.length === 1 ? 'day' : 'days'} before today`}
        </button>
      ) : null}
      {showPast ? (
        <ol id="rm-past-days" className="ms-rm-milestones ms-rm-history mb-6" aria-label="Days before today">
          {past.map((d) =>
            workTasks(d).length > 0 ? (
              <HistoryRow
                key={d.date}
                day={d}
                state={state}
                evidence={evidence}
                studied={historyDayDone(d, state, evidence, done)}
                onOpen={onOpen}
                onDone={onDone}
                onCarry={onCarry}
                onCarryAll={onCarryAll}
                busyId={busyId}
              />
            ) : (
              <MilestoneRow key={d.date} day={d} examLabels={examsOn(d.date)} done={historyDayDone(d, state, evidence, done)} />
            )
          )}
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
                todayIso={todayIso}
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
              <MilestoneRow key={d.day} day={d} examLabels={examsOn(d.date)} />
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

/** The study subjects on a day, "Mathematics · Physics"; empty when there is no work. */
function studySubjects(day: RoadmapDay): string {
  const work = workTasks(day)
  if (work.length === 0) return ''
  const subjects = [...new Set(work.map((t) => t.subjectLabel).filter((s): s is string => Boolean(s)))]
  return subjects.length ? subjects.join(' · ') : day.focus
}

/**
 * The focus column of a milestone row. On an exam day the exam comes first
 * ("Physics exam · Mathematics"), so a short task in another subject never
 * reads as that subject's exam.
 */
function milestoneFocus(day: RoadmapDay, examLabels: string[]): string {
  const exam = examLabels.length > 0 ? `${examLabels.join(' and ')} exam` : day.kind === 'exam' ? 'Exam' : ''
  const study = studySubjects(day)
  if (exam) return study ? `${exam} · ${study}` : exam
  if (study) return study
  return day.kind === 'rest' ? 'Rest day' : day.focus
}

/** "Timed paper" when the day holds one; "Review only" once nothing new starts. */
function phaseTag(day: RoadmapDay): string | null {
  if (day.blocks.some((b) => b.kind === 'timed_paper' || b.taskType === 'timed_paper')) return 'Timed paper'
  if (day.kind === 'review' || /^(Review only|Light review)/.test(day.focus)) return 'Review only'
  return null
}

function DayCard({
  day,
  heading,
  state,
  evidence,
  todayIso,
  onOpen,
  onDone,
  busyId,
  open,
}: {
  day: RoadmapDay
  heading: string
  state: TaskState
  evidence: ReadonlySet<string>
  todayIso: string
  onOpen: (task: RoadmapTask) => void
  onDone: (task: RoadmapTask) => void
  busyId: string | null
  open: boolean
}) {
  const work = workTasks(day)
  const withTime = work.some((t) => Boolean(t.startsAt))
  // The summary below owns the task count; the focus line names the subjects only.
  const allowDone = day.date <= todayIso
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
                allowDone={allowDone}
              />
            ))}
          </ol>
        </details>
      ) : null}
    </li>
  )
}

/**
 * One past day, unfolding into its tasks. The header is the date, the
 * subjects and "3 of 5 done · 1 moved"; inside, each task with what became
 * of it and, on anything not done, a Carry over button. Done stays
 * available from the task's own sheet for a day of this plan (a question
 * marked offline yesterday is still done); a day kept from an earlier
 * build can only be carried forward.
 */
function HistoryRow({
  day,
  state,
  evidence,
  studied,
  onOpen,
  onDone,
  onCarry,
  onCarryAll,
  busyId,
}: {
  day: HistoryDay
  state: TaskState
  evidence: ReadonlySet<string>
  studied: boolean
  onOpen: (task: RoadmapTask) => void
  onDone: (task: RoadmapTask) => void
  onCarry?: (task: RoadmapTask) => void
  onCarryAll?: (tasks: RoadmapTask[]) => void
  busyId: string | null
}) {
  const work = workTasks(day)
  const withTime = work.some((t) => Boolean(t.startsAt))
  const tally = historyTally(day, state, evidence)
  const leftover = work.filter((t) => carryable(taskStanding(t, state, evidence), state[t.id]))
  return (
    <li className={`ms-rm-history__day${studied ? ' is-done' : ''}${day.archived ? ' is-archived' : ''}`}>
      <details className="ms-rm-history__details">
        <summary className="ms-rm-history__summary">
          <span className="ms-rm-milestone__date">{formatPlanDate(day.date)}</span>
          <span className="ms-rm-history__focus">{studySubjects(day) || day.focus}</span>
          <span className="ms-rm-history__tally">{historyTallyLine(tally)}</span>
          {studied ? (
            <span className="ms-rm-milestone__done" aria-label="Studied">
              ✓
            </span>
          ) : null}
        </summary>
        {onCarryAll && leftover.length > 1 ? (
          <div className="ms-rm-history__all">
            <button type="button" className="ec-pill" disabled={busyId === 'carry'} onClick={() => onCarryAll(leftover)}>
              Carry all {leftover.length} not done to another day
            </button>
          </div>
        ) : null}
        <ol className={`ms-rm-rows${withTime ? ' ms-rm-rows--timed' : ''}`}>
          {work.map((t) => {
            const standing = taskStanding(t, state, evidence)
            const entry = state[t.id]
            return (
              <TaskCard
                key={t.id}
                task={t}
                standing={standing}
                entry={entry}
                minutes={taskMinutes(t, state)}
                withTime={withTime}
                onOpen={onOpen}
                onDone={onDone}
                busy={busyId === t.id || busyId === 'carry'}
                compact
                past
                allowDone={false}
                label={historyLabel(standing, entry)}
                onCarry={onCarry && carryable(standing, entry) ? onCarry : undefined}
              />
            )
          })}
        </ol>
      </details>
    </li>
  )
}

function MilestoneRow({ day, examLabels, done = false }: { day: RoadmapDay; examLabels: string[]; done?: boolean }) {
  const exam = examLabels.length > 0 || day.kind === 'exam'
  const phase = phaseTag(day)
  return (
    <li className={`ms-rm-milestone ms-rm-milestone--${day.kind}${done ? ' is-done' : ''}`}>
      <span className="ms-rm-milestone__date">{formatPlanDate(day.date)}</span>
      <span className="ms-rm-milestone__focus">{milestoneFocus(day, examLabels)}</span>
      <span className="ms-rm-milestone__mins">{day.workMinutes > 0 ? formatMinutes(day.workMinutes) : ''}</span>
      <span className="ms-rm-milestone__tags">
        {phase ? <span className="ms-rm-milestone__phase">{phase}</span> : null}
        {exam ? <span className="ms-rm-milestone__exam">exam</span> : null}
      </span>
      {done ? (
        <span className="ms-rm-milestone__done" aria-label="Studied">
          ✓
        </span>
      ) : null}
    </li>
  )
}
