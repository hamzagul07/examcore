'use client'

import { useEffect, useState } from 'react'
import { LoadingLink } from '@/components/ui/LoadingLink'
import type { RoadmapTodaySummary } from '@/lib/plan/roadmap-types'
import { fetchTodaySummary } from '@/components/plan/roadmap-client'

/**
 * After a marked result on /mark: the way back to the roadmap, with the
 * next task named so the student can go straight to it. Same fetch rules
 * as the chip (signed in only, cached per date); null when there is no
 * plan or nothing left today.
 */
export function RoadmapNextCard() {
  const [summary, setSummary] = useState<RoadmapTodaySummary | null>(null)
  // The task this desk was opened for (?task= on /mark): the plan page offers its check-in on return.
  const [fromTask, setFromTask] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    try {
      setFromTask(new URLSearchParams(window.location.search).get('task'))
    } catch {
      /* ignore */
    }
    void fetchTodaySummary().then((s) => {
      if (alive) setSummary(s)
    })
    return () => {
      alive = false
    }
  }, [])

  const task = summary?.nextTask ?? null
  if (!summary?.hasPlan) return null
  const backHref = fromTask ? `/dashboard/plan?task=${encodeURIComponent(fromTask)}` : '/dashboard/plan'

  return (
    <section className="ec-card ec-card--paper ms-rm-nextcard" aria-labelledby="rm-next-title">
      <p className="ec-eyebrow mb-1">Exam roadmap</p>
      <h2 id="rm-next-title" className="ms-rm-nextcard__title">
        {task ? (
          <>
            Back to your roadmap · next: <span className="ms-rm-nextcard__task">{task.objective}</span>
          </>
        ) : (
          'Back to your roadmap · nothing more today'
        )}
      </h2>
      {task ? (
        <p className="ms-rm-nextcard__meta">
          {[task.subjectLabel, `${task.minutes} min`, task.startsAt ? `from ${task.startsAt}` : null].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      <div className="ms-rm-actions">
        <LoadingLink href={backHref} variant="button" loadingText="Opening…" className="ms-rm-btn">
          Open roadmap
        </LoadingLink>
        {task?.href ? (
          <LoadingLink href={task.href} variant="button" loadingText="Opening…" className="ec-btn-primary ms-rm-btn ms-rm-btn--primary">
            Start next
          </LoadingLink>
        ) : null}
      </div>
    </section>
  )
}
