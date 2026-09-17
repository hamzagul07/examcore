'use client'

import { useId } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { WHY_SHEET_FOOTER } from '@/lib/plan/modes'
import type { RoadmapTask } from '@/lib/plan/roadmap-view'
import { EVIDENCE_SOURCE_LABEL } from '@/components/plan/roadmap/labels'
import { taskSubtitle } from '@/components/plan/roadmap/hero-copy'

/**
 * "Why this now?" — the task's evidence, one line each with where it came
 * from, and always the footer: chosen from the syllabus, the student's own
 * marked answers and what they told us; not a prediction; not endorsed. A
 * task with nothing beyond the syllabus says exactly that.
 */
/** The one line for a task with no evidence attached — true of its type, never a syllabus claim about a paper. */
export function plainWhy(task: Pick<RoadmapTask, 'taskType' | 'subjectLabel'>): string {
  const subject = task.subjectLabel ? ` for ${task.subjectLabel}` : ''
  switch (task.taskType) {
    case 'timed_paper':
      return `A timed sitting${subject} under exam conditions. Nothing more is claimed about it.`
    case 'mixed':
      return `Mixed practice${subject} across recent topics. Nothing more is claimed about it.`
    case 'error_review':
      return `A look back over your marked ${task.subjectLabel ?? ''} answers. Nothing more is claimed about it.`.replace('  ', ' ')
    default:
      return `It is next in the syllabus${subject}. Nothing more is claimed about it.`
  }
}

export function WhyThisSheet({ task, open, onClose }: { task: RoadmapTask | null; open: boolean; onClose: () => void }) {
  const titleId = useId()
  const why = task?.why ?? []
  return (
    <Sheet open={open && Boolean(task)} onClose={onClose} labelledById={titleId}>
      {task ? (
        <div className="ms-rm-sheet">
          <p className="ec-eyebrow mb-1">Why this now?</p>
          <h2 id={titleId} className="ms-rm-sheet__title">
            {task.objective}
          </h2>
          {taskSubtitle(task) ? <p className="ms-rm-sheet__sub">{taskSubtitle(task)}</p> : null}
          {why.length > 0 ? (
            <ul className="ms-rm-why">
              {why.map((w, i) => (
                <li key={i} className="ms-rm-why__item">
                  <span className="ms-rm-why__text">{w.explanation}</span>
                  <span className="ms-rm-why__source">{EVIDENCE_SOURCE_LABEL[w.source]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ms-rm-why__plain">{plainWhy(task)}</p>
          )}
          <p className="ms-rm-sheet__footer">{WHY_SHEET_FOOTER}</p>
        </div>
      ) : null}
    </Sheet>
  )
}
