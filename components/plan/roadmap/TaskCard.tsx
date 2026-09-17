'use client'

import { TASK_CATEGORY_LABEL, type TaskStateEntry } from '@/lib/plan/roadmap-types'
import type { RoadmapTask, TaskStanding } from '@/lib/plan/roadmap-view'
import { standingLabel, timeSpan } from '@/components/plan/roadmap/labels'

type Props = {
  task: RoadmapTask
  standing: TaskStanding
  entry?: TaskStateEntry
  /** Minutes after any shorten. */
  minutes: number
  /** Whether the timeline has a time gutter at all (v3 plans). */
  withTime: boolean
  onOpen: (task: RoadmapTask) => void
  onDone: (task: RoadmapTask) => void
  busy?: boolean
  compact?: boolean
}

/**
 * One work task on the day's timeline. The card itself opens the detail
 * sheet; the Done button is separate so a tick is one tap, not two. A done
 * task keeps its place and turns emerald; skipped, deferred and dropped
 * tasks stay in neutral so the day reads as a record, not a scorecard.
 */
export function TaskCard({ task, standing, entry, minutes, withTime, onOpen, onDone, busy = false, compact = false }: Props) {
  const label = standingLabel(standing, entry)
  const settled = standing === 'done' || standing === 'skipped' || standing === 'deferred' || standing === 'dropped'
  const subject = task.subjectLabel ?? ''
  return (
    <li className={`ms-rm-row ms-rm-row--task ms-rm-row--${task.category} is-${standing}${compact ? ' ms-rm-row--compact' : ''}`}>
      {withTime ? (
        <span className="ms-rm-time" aria-hidden={!task.startsAt}>
          {timeSpan(task)}
        </span>
      ) : null}
      <button
        type="button"
        className="ms-rm-task"
        onClick={() => onOpen(task)}
        aria-haspopup="dialog"
        aria-label={`${task.objective}${subject ? `, ${subject}` : ''}, ${minutes} minutes${label ? `, ${label}` : ''}`}
      >
        <span className="ms-rm-task__meta">
          <span className={`ms-rm-tag ms-rm-tag--${task.category}`}>{TASK_CATEGORY_LABEL[task.category]}</span>
          <span className="ms-rm-task__min">{minutes} min</span>
          {subject ? <span className="ms-rm-task__subject">{subject}</span> : null}
          {task.pinned ? <span className="ms-rm-task__pin">Pinned</span> : null}
        </span>
        <span className="ms-rm-task__objective">{task.objective}</span>
        {task.resourceLabel && !compact ? <span className="ms-rm-task__res">{task.resourceLabel}</span> : null}
        {label ? (
          <span className={`ms-rm-standing is-${standing}`}>
            {standing === 'done' ? <span aria-hidden>✓ </span> : null}
            {label}
          </span>
        ) : null}
      </button>
      {!settled ? (
        <button
          type="button"
          className="ms-rm-done"
          onClick={() => onDone(task)}
          disabled={busy}
          aria-label={`Mark done: ${task.objective}`}
        >
          Done
        </button>
      ) : null}
    </li>
  )
}
