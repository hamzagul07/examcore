'use client'

import { useState } from 'react'
import { formatMinutes, formatPlanDate } from '@/lib/plan/plan-view'
import { MIN_BUFFER_MINUTES, type TaskState } from '@/lib/plan/roadmap-types'
import { minuteOfDay, taskMinutes, taskStanding, type RoadmapDay, type RoadmapTask } from '@/lib/plan/roadmap-view'
import { TaskCard } from '@/components/plan/roadmap/TaskCard'

const EXPANDED_WORK_TASKS = 4

type Props = {
  day: RoadmapDay
  state: TaskState
  evidence: ReadonlySet<string>
  todayIso: string
  onOpen: (task: RoadmapTask) => void
  onDone: (task: RoadmapTask) => void
  busyId?: string | null
  /** The day header's first word: "Today", "Tomorrow", or the date. */
  heading?: string
}

type Row =
  | { key: string; at: number | null; kind: 'task'; task: RoadmapTask }
  | { key: string; at: number | null; kind: 'break'; minutes: number }
  | { key: string; at: number | null; kind: 'commitment'; label: string; start: string; end: string; exam: boolean }

/**
 * The day, top to bottom: tasks in order with their clock times, breaks as
 * light rows, commitments in their time position, the buffer as a number in
 * the header rather than a block (time in hand is not a task). More than
 * four work tasks collapse under "and n more": the card should fit a phone
 * screen with the hero above it.
 */
export function DayTimeline({ day, state, evidence, todayIso, onOpen, onDone, busyId = null, heading }: Props) {
  const [expanded, setExpanded] = useState(false)

  const withTime = day.blocks.some((b) => Boolean(b.startsAt))
  const bufferBlock = day.blocks.find((b) => b.kind === 'buffer')
  const inHand = Math.max(day.bufferMinutes, bufferBlock?.minutes ?? 0)

  const rows: Row[] = []
  let workSeen = 0
  let hiddenWork = 0
  for (let i = 0; i < day.blocks.length; i++) {
    const b = day.blocks[i]!
    if (b.kind === 'buffer' || b.kind === 'rest') continue
    if (b.kind === 'break') {
      if (workSeen >= EXPANDED_WORK_TASKS && !expanded) continue
      rows.push({ key: `break-${i}`, at: b.startsAt ? minuteOfDay(b.startsAt) : null, kind: 'break', minutes: b.minutes })
      continue
    }
    workSeen += 1
    if (workSeen > EXPANDED_WORK_TASKS && !expanded) {
      hiddenWork += 1
      continue
    }
    rows.push({ key: b.id, at: b.startsAt ? minuteOfDay(b.startsAt) : null, kind: 'task', task: b })
  }
  const commitments: Row[] = day.commitments.map((c, i) => ({
    key: `c-${i}`,
    at: minuteOfDay(c.start),
    kind: 'commitment',
    label: c.label,
    start: c.start,
    end: c.end,
    exam: c.kind === 'exam',
  }))

  // With clock times the commitments slot in where they fall; without them
  // (a v2 plan) they sit after the blocks under their own heading.
  const merged: Row[] = withTime
    ? [...rows, ...commitments].sort((a, b) => (a.at ?? Number.MAX_SAFE_INTEGER) - (b.at ?? Number.MAX_SAFE_INTEGER))
    : rows
  const trailing = withTime ? [] : commitments

  const label = heading ?? (day.date === todayIso ? 'Today' : formatPlanDate(day.date))

  return (
    <section className={`ms-rm-day ms-rm-day--${day.kind}`} aria-label={`${label}: ${day.focus}`}>
      <header className="ms-rm-day__head">
        <span className="ms-rm-day__date">{label}</span>
        {heading ? <span className="ms-rm-day__sub">{formatPlanDate(day.date)}</span> : null}
        {day.workMinutes > 0 ? <span className="ms-rm-day__mins">{formatMinutes(day.workMinutes)}</span> : null}
        {inHand >= MIN_BUFFER_MINUTES ? <span className="ms-rm-day__hand">about {inHand} min in hand</span> : null}
      </header>
      <ol className={`ms-rm-rows${withTime ? ' ms-rm-rows--timed' : ''}`}>
        {merged.map((row) => {
          if (row.kind === 'task') {
            const standing = taskStanding(row.task, state, evidence)
            return (
              <TaskCard
                key={row.key}
                task={row.task}
                standing={standing}
                entry={state[row.task.id]}
                minutes={taskMinutes(row.task, state)}
                withTime={withTime}
                onOpen={onOpen}
                onDone={onDone}
                busy={busyId === row.task.id}
              />
            )
          }
          if (row.kind === 'break') {
            return (
              <li key={row.key} className="ms-rm-row ms-rm-row--break" aria-label={`Break, ${row.minutes} minutes`}>
                {withTime ? <span className="ms-rm-time" aria-hidden /> : null}
                <span className="ms-rm-break">{row.minutes} min off</span>
              </li>
            )
          }
          return <CommitmentRow key={row.key} row={row} withTime={withTime} />
        })}
        {hiddenWork > 0 ? (
          <li className="ms-rm-row ms-rm-row--more">
            {withTime ? <span className="ms-rm-time" aria-hidden /> : null}
            <button type="button" className="ms-rm-more" onClick={() => setExpanded(true)} aria-expanded={false}>
              and {hiddenWork} more
            </button>
          </li>
        ) : null}
      </ol>
      {trailing.length > 0 ? (
        <ol className="ms-rm-rows ms-rm-rows--trailing" aria-label="Also today">
          {trailing.map((row) => (row.kind === 'commitment' ? <CommitmentRow key={row.key} row={row} withTime={false} /> : null))}
        </ol>
      ) : null}
    </section>
  )
}

function CommitmentRow({ row, withTime }: { row: Extract<Row, { kind: 'commitment' }>; withTime: boolean }) {
  return (
    <li className={`ms-rm-row ms-rm-row--commitment${row.exam ? ' is-exam' : ''}`}>
      {withTime ? <span className="ms-rm-time">{row.start}–{row.end}</span> : null}
      <span className="ms-rm-commitment">
        {row.label}
        {!withTime ? <span className="ms-rm-commitment__when"> · {row.start}–{row.end}</span> : null}
      </span>
    </li>
  )
}
