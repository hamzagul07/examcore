'use client'

import { useId } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { WHY_SHEET_FOOTER } from '@/lib/plan/modes'
import { TASK_CATEGORY_LABEL, TASK_TYPE_LABEL, type TaskAction, type TaskStateEntry } from '@/lib/plan/roadmap-types'
import type { RoadmapTask, TaskStanding } from '@/lib/plan/roadmap-view'
import { destinationLabel, shortenedMinutes, standingLabel } from '@/components/plan/roadmap/labels'
import { taskSubtitle } from '@/components/plan/roadmap/hero-copy'

type Props = {
  task: RoadmapTask | null
  standing: TaskStanding
  entry?: TaskStateEntry
  minutes: number
  open: boolean
  busy: boolean
  onClose: () => void
  /** Start is a navigation; the action is recorded as it leaves. */
  onStart: (task: RoadmapTask) => void
  onAction: (task: RoadmapTask, action: TaskAction, extra?: { minutes?: number }) => void
  onWhy: (task: RoadmapTask) => void
}

/**
 * A task in full: what to do, where it opens, why it is here, and the five
 * things the student can do about it. Every action is one tap and every one
 * is reversible from the plan's undo; none of them needs a reason.
 */
export function TaskDetailSheet({ task, standing, entry, minutes, open, busy, onClose, onStart, onAction, onWhy }: Props) {
  const titleId = useId()
  if (!task) return <Sheet open={false} onClose={onClose}>{null}</Sheet>
  const settled = standing === 'done' || standing === 'skipped' || standing === 'deferred' || standing === 'dropped'
  const shorter = shortenedMinutes(task.taskType, minutes)
  const label = standingLabel(standing, entry)
  const sub = taskSubtitle(task)
  return (
    <Sheet open={open} onClose={onClose} labelledById={titleId}>
      <div className="ms-rm-sheet">
        <p className="ec-eyebrow mb-1">
          {TASK_CATEGORY_LABEL[task.category]} · {TASK_TYPE_LABEL[task.taskType]}
        </p>
        <h2 id={titleId} className="ms-rm-sheet__title">
          {task.objective}
        </h2>
        <p className="ms-rm-sheet__sub">
          {sub ? `${sub} · ` : ''}
          {minutes} min
          {task.startsAt ? ` · ${task.startsAt}${task.endsAt ? `–${task.endsAt}` : ''}` : ''}
        </p>
        <p className="ms-rm-sheet__dest">{destinationLabel(task)}</p>
        {label ? <p className={`ms-rm-standing is-${standing} ms-rm-sheet__standing`}>{label}</p> : null}

        {task.why.length > 0 ? (
          <ul className="ms-rm-why ms-rm-why--short">
            {task.why.slice(0, 3).map((w, i) => (
              <li key={i} className="ms-rm-why__item">
                <span className="ms-rm-why__text">{w.explanation}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="ms-rm-sheet__footer">{WHY_SHEET_FOOTER}</p>

        <div className="ms-rm-actions">
          {task.href && !settled ? (
            <LoadingLink
              href={task.href}
              variant="button"
              loadingText="Opening…"
              className="ec-btn-primary ms-rm-btn ms-rm-btn--primary"
              onNavigate={() => onStart(task)}
            >
              {standing === 'started' ? 'Continue' : 'Start'}
            </LoadingLink>
          ) : null}
          {!settled ? (
            <button type="button" className="ms-rm-btn" disabled={busy} onClick={() => onAction(task, 'complete')}>
              Done
            </button>
          ) : null}
          <button type="button" className="ms-rm-btn" onClick={() => onWhy(task)}>
            Why this?
          </button>
        </div>

        {!settled ? (
          <div className="ms-rm-actions ms-rm-actions--secondary" aria-label="Change this task">
            <button
              type="button"
              className="ms-rm-btn ms-rm-btn--quiet"
              disabled={busy || shorter === null}
              title={shorter === null ? 'Already as short as this kind of task goes' : undefined}
              onClick={() => shorter !== null && onAction(task, 'shorten', { minutes: shorter })}
            >
              {shorter === null ? 'Shorten' : `Shorten to ${shorter} min`}
            </button>
            <button type="button" className="ms-rm-btn ms-rm-btn--quiet" disabled={busy} onClick={() => onAction(task, 'swap')}>
              Swap topic
            </button>
            <button type="button" className="ms-rm-btn ms-rm-btn--quiet" disabled={busy} onClick={() => onAction(task, 'defer')}>
              Defer to a day with room
            </button>
            <button type="button" className="ms-rm-btn ms-rm-btn--quiet" disabled={busy} onClick={() => onAction(task, 'skip')}>
              Skip
            </button>
            <button
              type="button"
              className="ms-rm-btn ms-rm-btn--quiet"
              disabled={busy}
              aria-pressed={Boolean(task.pinned)}
              onClick={() => onAction(task, task.pinned ? 'unpin' : 'pin')}
            >
              {task.pinned ? 'Unpin' : 'Pin — never moved by a replan'}
            </button>
          </div>
        ) : null}
      </div>
    </Sheet>
  )
}
