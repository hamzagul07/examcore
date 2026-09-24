'use client'

import { useEffect, useState } from 'react'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
import { normaliseRoadmap } from '@/lib/plan/roadmap-view'
import { RoadmapSetup, type SetupProfile, type SetupSaved, type SetupSubjectOption } from '@/components/plan/RoadmapSetup'
import { RoadmapScreen, type RoadmapInitial } from '@/components/plan/RoadmapScreen'

type Props = {
  initial: RoadmapInitial | null
  /** Evidence keys (see blockEvidenceKey) for questions marked since the plan was built. */
  evidence: string[]
  firstName: string
  subjectOptions: SetupSubjectOption[]
  profile: SetupProfile
}

type DeepLink = { taskId: string | null; why: boolean; history: boolean }

/**
 * /dashboard/plan: the switch between the setup wizard and the roadmap.
 *
 * No plan yet, or the student chose Adjust or "Let's reset", shows the
 * wizard; otherwise the roadmap. The URL carries three things worth
 * reading once and then dropping: ?src=checkin (opened from the morning
 * email — counted as both the check-in open and the reminder click),
 * ?task={id} (back from /mark, or a deep link from the email: open that
 * task's check-in once it shows as done), ?why=1 (the dashboard card's
 * "Why this?" link) and ?history=1 (the check-in email's "see the days
 * before today": the Roadmap tab with the past days unfolded). All are
 * stripped so a reload does not count or open them twice.
 */
export function StudyPlanScreen({ initial, evidence, firstName, subjectOptions, profile }: Props) {
  const [saved, setSaved] = useState<RoadmapInitial | null>(initial)
  const [view, setView] = useState<'setup' | 'screen'>(initial ? 'screen' : 'setup')
  const [deepLink, setDeepLink] = useState<DeepLink>({ taskId: null, why: false, history: false })

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const src = sp.get('src')
      const task = sp.get('task')
      const why = sp.get('why') === '1'
      const history = sp.get('history') === '1'
      if (src === 'checkin') {
        trackFunnelEvent('plan_checkin_opened')
        trackFunnelEvent('reminder_clicked')
        // The page is server-rendered, so the backoff reset lives on the API: one cheap read marks the check-in opened.
        void fetch('/api/plan/today?src=checkin', { cache: 'no-store' }).catch(() => {})
      }
      if (task || history) setDeepLink({ taskId: task, why, history })
      if (src !== null || task !== null || sp.has('why') || sp.has('history')) {
        sp.delete('src')
        sp.delete('task')
        sp.delete('why')
        sp.delete('history')
        const q = sp.toString()
        window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''))
      }
    } catch {
      /* ignore */
    }
  }, [])

  if (view === 'screen' && saved) {
    return (
      <RoadmapScreen
        // A rebuild is a new roadmap; remount so no sheet or optimistic state survives it.
        key={saved.plan.generatedAt ?? saved.revision}
        initial={saved}
        evidence={evidence}
        firstName={firstName}
        profileExamDate={profile.examDate}
        openTaskId={deepLink.taskId}
        openWhy={deepLink.why}
        openHistory={deepLink.history}
        onAdjust={() => {
          setView('setup')
          window.scrollTo({ top: 0 })
        }}
      />
    )
  }

  return (
    <RoadmapSetup
      subjectOptions={subjectOptions}
      profile={profile}
      prior={saved ? normaliseRoadmap(saved.plan) : null}
      onBuilt={(next: SetupSaved) => {
        setSaved({ plan: next.plan, done: next.done, taskState: next.taskState, revision: next.revision, canUndo: false })
        setDeepLink({ taskId: null, why: false, history: false })
        setView('screen')
        window.scrollTo({ top: 0 })
      }}
      onCancel={saved ? () => setView('screen') : undefined}
    />
  )
}
