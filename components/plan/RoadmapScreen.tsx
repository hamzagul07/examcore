'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { Sheet } from '@/components/ui/Sheet'
import { ErrorBox } from '@/components/AuthFormBits'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
import { formatPlanDate, todayInZone, type DoneDays, type HydratedPlan } from '@/lib/plan/plan-view'
import { availableFeels } from '@/lib/plan/task-actions'
import type { CheckinFeel, ReplanDiff, TaskAction, TaskState, TaskStateEntry } from '@/lib/plan/roadmap-types'
import {
  heroFor,
  nearestExam,
  normaliseDay,
  normaliseRoadmap,
  roadmapStatus,
  studiedDaysLine,
  taskMinutes,
  taskStanding,
  workTasks,
  type RoadmapPlan,
  type RoadmapTask,
} from '@/lib/plan/roadmap-view'
import {
  applyQueueOutcome,
  clearTodayCache,
  flushQueue,
  mutationDays,
  queuedCount,
  replanToday,
  spliceDays,
  taskAction,
  undoLast,
  type DayMutation,
  type MutationOutcome,
  type PlanPayload,
} from '@/components/plan/roadmap-client'
import { countdownLine, heroCopy } from '@/components/plan/roadmap/hero-copy'
import { nowMinuteInZone } from '@/components/plan/roadmap/zone-clock'
import { StatusChip } from '@/components/plan/roadmap/StatusChip'
import { DayTimeline } from '@/components/plan/roadmap/DayTimeline'
import { RoadmapTimeline } from '@/components/plan/roadmap/RoadmapTimeline'
import { TaskDetailSheet } from '@/components/plan/roadmap/TaskDetailSheet'
import { WhyThisSheet } from '@/components/plan/roadmap/WhyThisSheet'
import { TaskCheckinSheet, type RatingKind } from '@/components/plan/roadmap/TaskCheckinSheet'
import { ReplanSheet, type ReplanSheetMode } from '@/components/plan/roadmap/ReplanSheet'

export type RoadmapInitial = {
  plan: HydratedPlan
  done: DoneDays
  taskState: TaskState
  revision: number
  /** Whether the server holds an undo point for the last replan, rollover or check-in effect. */
  canUndo?: boolean
  /** The server's clock in the plan's zone at render, so the first client render matches the HTML. */
  todayIso?: string
  nowMinute?: number
}

type Props = {
  initial: RoadmapInitial
  evidence: string[]
  firstName: string
  /** The profile's exam date, so a plan built for another date says so. */
  profileExamDate?: string | null
  /** ?task={id} from a /mark return or a check-in email: open that task's check-in once it shows as done. */
  openTaskId?: string | null
  /** ?why=1 with ?task: open the Why sheet instead. */
  openWhy?: boolean
  onAdjust: () => void
}

type Tab = 'today' | 'roadmap'
const TAB_KEY = 'ms-roadmap-tab'
const COMPLETED_KEY = 'ms-roadmap-completed'
const RATED_KEY = 'ms-roadmap-rated'
const SYNC_NOTE = 'Saved on this device — will sync'
const DEFAULT_ADJUSTED_LINE = 'Plans change. We protected the essentials and rebuilt today.'
const DIFF_SHOWN_KEY = 'ms-roadmap-diff-shown'

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

const OPTIMISTIC: Partial<Record<TaskAction, TaskStateEntry['status']>> = {
  start: 'started',
  complete: 'done',
  skip: 'skipped',
  defer: 'deferred',
  shorten: 'shortened',
}

/**
 * The roadmap itself. Two tabs: Today (the hero, then the day's timeline)
 * and Roadmap (the next days, the milestones, the exam dates).
 *
 * The clock is the plan's, not the browser's: todayIso and nowMinute start
 * from the server's reading in the plan's zone (so the first render matches
 * the HTML) and tick every minute from there, so a student reading their
 * Karachi plan from London sees the Karachi evening. Every mutation is
 * optimistic, goes through roadmap-client (revision replay, offline queue)
 * and splices the returned day back in by date. Nothing here computes a
 * streak or a count of what did not happen; the chip and the studied-days
 * line come from roadmap-view and say only what is true.
 */
export function RoadmapScreen({ initial, evidence: evidenceList, firstName, profileExamDate = null, openTaskId = null, openWhy = false, onAdjust }: Props) {
  const [plan, setPlan] = useState<RoadmapPlan>(() => normaliseRoadmap(initial.plan))
  const [done, setDone] = useState<DoneDays>(initial.done)
  const [taskState, setTaskState] = useState<TaskState>(initial.taskState)
  const [revision, setRevision] = useState(initial.revision)
  const [evidence, setEvidence] = useState<ReadonlySet<string>>(() => new Set(evidenceList))

  const tz = plan.timeZone
  const [todayIso, setTodayIso] = useState(() => initial.todayIso ?? todayInZone(tz))
  const [nowMinute, setNowMinute] = useState(() => initial.nowMinute ?? 0)
  useEffect(() => {
    const tick = () => {
      setTodayIso(todayInZone(tz))
      setNowMinute(nowMinuteInZone(tz))
    }
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [tz])

  const [tab, setTab] = useState<Tab>('today')
  useEffect(() => {
    const saved = readSession(TAB_KEY)
    if (saved === 'roadmap' || saved === 'today') setTab(saved)
  }, [])
  const chooseTab = (t: Tab) => {
    setTab(t)
    try {
      sessionStorage.setItem(TAB_KEY, t)
    } catch {
      /* ignore */
    }
  }

  const [detail, setDetail] = useState<RoadmapTask | null>(null)
  const [why, setWhy] = useState<RoadmapTask | null>(null)
  const [checkin, setCheckin] = useState<RoadmapTask | null>(null)
  const [askRatings, setAskRatings] = useState(false)
  const [replan, setReplan] = useState<{ mode: ReplanSheetMode; diff: ReplanDiff | null } | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  // A diff made earlier (a rollover on this read, a check-in yesterday evening) rides on the plan, so "See what changed" and Undo survive the page load.
  const [lastDiff, setLastDiff] = useState<ReplanDiff | null>(() => {
    const p = normaliseRoadmap(initial.plan)
    return p.lastDiffDate === (initial.todayIso ?? todayInZone(p.timeZone)) ? (p.lastDiff ?? null) : null
  })
  const [canUndo, setCanUndo] = useState(initial.canUndo ?? false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [syncNote, setSyncNote] = useState<string | null>(null)

  useEffect(() => {
    trackFunnelEvent('roadmap_viewed')
  }, [])

  const today = useMemo(() => plan.days.find((d) => d.date === todayIso) ?? null, [plan, todayIso])
  const nearest = nearestExam(plan, todayIso)
  const status = roadmapStatus(plan, taskState, evidence, done, todayIso)
  const studiedLine = studiedDaysLine(plan, taskState, evidence, done, todayIso)
  const examPassed = plan.examDate <= todayIso
  const examMoved = Boolean(profileExamDate && profileExamDate !== plan.examDate)

  // --- state plumbing -------------------------------------------------------------

  const applyPayload = useCallback((p: PlanPayload) => {
    if (p.plan) {
      const next = normaliseRoadmap(p.plan)
      setPlan(next)
      setLastDiff(next.lastDiff ?? null)
    }
    setDone(p.done)
    setTaskState(p.taskState)
    setRevision(p.revision)
    setEvidence(new Set(p.evidence))
    setCanUndo(p.canUndo)
  }, [])

  const markDiffShown = useCallback(
    (rev: number) => {
      try {
        sessionStorage.setItem(`${DIFF_SHOWN_KEY}:${todayIso}:${rev}`, '1')
      } catch {
        /* ignore */
      }
    },
    [todayIso]
  )

  const applyMutation = useCallback(
    (m: DayMutation, showDiff: boolean) => {
      const hasDiff = Boolean(m.diff && m.diff.changes.length > 0)
      // The server says where the "Adjusted today" mark now stands (an undo clears it); an older server leaves it to the diff.
      const knowsMarks = m.lastDiffDate !== undefined
      setPlan((prev) => ({
        ...prev,
        days: spliceDays(prev.days, mutationDays(m).map(normaliseDay)),
        revision: m.revision,
        lastDiffDate: knowsMarks ? (m.lastDiffDate ?? undefined) : hasDiff ? m.date : prev.lastDiffDate,
        lastDiff: knowsMarks ? (m.lastDiff ?? undefined) : hasDiff && m.diff ? m.diff : prev.lastDiff,
      }))
      setTaskState(m.taskState)
      setRevision(m.revision)
      clearTodayCache()
      if (knowsMarks) {
        setLastDiff(m.lastDiff ?? null)
        setCanUndo(m.canUndo === true)
      } else if (hasDiff && m.diff) {
        setLastDiff(m.diff)
        setCanUndo(true)
      }
      if (showDiff && m.diff) {
        setReplan({ mode: 'diff', diff: m.diff })
        markDiffShown(m.revision)
      }
    },
    [markDiffShown]
  )

  // A diff that was made before this page loaded (the lazy rollover, a check-in from another device) is shown once.
  useEffect(() => {
    if (!lastDiff || plan.lastDiffDate !== todayIso) return
    if (readSession(`${DIFF_SHOWN_KEY}:${todayIso}:${revision}`) === '1') return
    markDiffShown(revision)
    setReplan({ mode: 'diff', diff: lastDiff })
    // Once, on the first render that has the diff; later revisions mark themselves as they are shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const settle = useCallback(
    (outcome: MutationOutcome, showDiff: boolean, revert?: () => void): boolean => {
      if (outcome.kind === 'ok') {
        if (outcome.refreshed) applyPayload(outcome.refreshed)
        applyMutation(outcome.data, showDiff)
        if (queuedCount() === 0) setSyncNote(null)
        return true
      }
      if (outcome.kind === 'queued') {
        setSyncNote(SYNC_NOTE)
        return true
      }
      revert?.()
      if (outcome.kind === 'stale') {
        if (outcome.refreshed) applyPayload(outcome.refreshed)
        setError('Your plan moved on in another tab. This is the latest version.')
      } else {
        setError(outcome.message)
      }
      return false
    },
    [applyMutation, applyPayload]
  )

  // Replay anything saved offline: on mount, and whenever the browser comes back.
  useEffect(() => {
    const replay = () => {
      if (queuedCount() === 0) return
      void flushQueue((_, outcome) => applyQueueOutcome(outcome, applyPayload, (m) => applyMutation(m, false))).then(() => {
        if (queuedCount() === 0) setSyncNote(null)
      })
    }
    replay()
    window.addEventListener('online', replay)
    return () => window.removeEventListener('online', replay)
  }, [applyMutation, applyPayload])

  // --- actions ------------------------------------------------------------------------

  const act = useCallback(
    async (task: RoadmapTask, action: TaskAction, extra: { minutes?: number; feel?: CheckinFeel; actualMinutes?: number } = {}) => {
      setError('')
      const before = taskState
      const status = OPTIMISTIC[action]
      if (status) {
        setTaskState((s) => ({
          ...s,
          [task.id]: { ...s[task.id], status, at: new Date().toISOString(), ...(extra.minutes ? { minutes: extra.minutes } : {}) },
        }))
      }
      setBusyId(task.id)
      try {
        const outcome = await taskAction({ taskId: task.id, action, revision, ...extra }, nowMinute)
        const ok = settle(outcome, action !== 'start', () => setTaskState(before))
        if (ok) {
          if (action === 'start') trackFunnelEvent('task_started', { subject: task.subjectCode ?? null })
          if (action === 'complete') trackFunnelEvent('task_completed', { subject: task.subjectCode ?? null })
          if (action === 'skip') trackFunnelEvent('task_skipped', { subject: task.subjectCode ?? null })
          if (action === 'swap') trackFunnelEvent('task_swapped', { subject: task.subjectCode ?? null })
        }
      } finally {
        setBusyId(null)
      }
    },
    [taskState, revision, nowMinute, settle]
  )

  const complete = useCallback(
    (task: RoadmapTask) => {
      const n = Number(readLocal(COMPLETED_KEY) ?? '0') + 1
      writeLocal(COMPLETED_KEY, String(n))
      setAskRatings(n >= 3 && readLocal(RATED_KEY) !== '1')
      setDetail(null)
      setCheckin(task)
      void act(task, 'complete')
    },
    [act]
  )

  const start = useCallback(
    (task: RoadmapTask) => {
      setDetail(null)
      void act(task, 'start')
    },
    [act]
  )

  const openWhySheet = useCallback((task: RoadmapTask) => {
    setDetail(null)
    setWhy(task)
    trackFunnelEvent('why_this_task_opened', { subject: task.subjectCode ?? null })
  }, [])

  const onFeel = useCallback(
    (task: RoadmapTask, feel: CheckinFeel, actualMinutes?: number) => {
      void act(task, 'checkin', { feel, actualMinutes })
    },
    [act]
  )

  const onRating = useCallback((kind: RatingKind, value: boolean) => {
    writeLocal(RATED_KEY, '1')
    trackFunnelEvent(kind, { value })
  }, [])

  const closeCheckin = useCallback(() => {
    if (askRatings) writeLocal(RATED_KEY, '1')
    setAskRatings(false)
    setCheckin(null)
  }, [askRatings])

  const confirmReplan = useCallback(
    async (minutesLeft?: number) => {
      if (!today) return
      setError('')
      setBusyId('replan')
      try {
        const outcome = await replanToday({ scope: 'today', date: today.date, nowMinute, revision, minutesLeft })
        if (settle(outcome, true)) {
          trackFunnelEvent('roadmap_replanned')
          if (outcome.kind === 'queued') setReplan(null)
        }
      } finally {
        setBusyId(null)
      }
    },
    [today, nowMinute, revision, settle]
  )

  const undo = useCallback(async () => {
    setError('')
    setBusyId('undo')
    try {
      const outcome = await undoLast(revision)
      if (outcome.kind === 'ok') {
        if (outcome.refreshed) applyPayload(outcome.refreshed)
        // The response carries the restored marks: the chip, "See what changed" and Undo all follow the snapshot.
        applyMutation(outcome.data, false)
        if (outcome.data.lastDiffDate === undefined) {
          setLastDiff(null)
          setCanUndo(false)
        }
        setReplan(null)
      } else {
        settle(outcome, false)
      }
    } finally {
      setBusyId(null)
    }
  }, [revision, applyMutation, applyPayload, settle])

  // A deep link (?task= from /mark or a check-in email): the check-in for a
  // task that now shows as done, or its Why sheet. Handled once.
  const handledLink = useRef<string | null>(null)
  useEffect(() => {
    if (!openTaskId || handledLink.current === openTaskId) return
    handledLink.current = openTaskId
    let found: RoadmapTask | null = null
    for (const d of [...(today ? [today] : []), ...plan.days]) {
      found = workTasks(d).find((t) => t.id === openTaskId) ?? null
      if (found) break
    }
    if (!found) return
    if (openWhy) {
      openWhySheet(found)
      return
    }
    if (taskStanding(found, taskState, evidence) === 'done') setCheckin(found)
  }, [openTaskId, openWhy, plan.days, today, taskState, evidence, openWhySheet])

  // --- render ---------------------------------------------------------------------------

  const titleId = useId()
  const hero = today ? heroFor(plan, today, taskState, evidence, nowMinute) : null
  const copy = today && hero ? heroCopy(hero, { plan, day: today, todayIso, studiedLine }) : null
  const heroTask = hero?.kind === 'task' ? hero.task : null
  const detailStanding = detail ? taskStanding(detail, taskState, evidence) : 'todo'

  return (
    <div className="ms-plan ms-rm">
      <header className="ms-rm-head mb-5">
        <p className="ec-eyebrow">Exam roadmap</p>
        <h1 className="text-hero ms-rm-head__title">
          {examPassed ? 'Your exams are done.' : countdownLine(nearest)}
        </h1>
        {today ? (
          <p className="ms-rm-head__line">
            Day {today.day} of your roadmap · {studiedLine}
          </p>
        ) : !examPassed ? (
          <p className="ms-plan-note">
            Today isn&apos;t on this roadmap (it was built for {formatPlanDate(plan.days[0]?.date ?? plan.examDate)} onward).{' '}
            <button type="button" className="ms-plan-linkbtn" onClick={onAdjust}>
              Rebuild it from today
            </button>
            .
          </p>
        ) : null}
        <div className="ms-rm-head__row">
          <StatusChip status={status} onReset={() => setResetOpen(true)} />
          {firstName ? <span className="ms-rm-head__name">{firstName}</span> : null}
        </div>
      </header>

      {examMoved && profileExamDate ? (
        <p className="ms-plan-note ms-rm-note mb-5" role="status">
          Your exam date is now <strong>{formatPlanDate(profileExamDate)}</strong>, but this plan was built for {formatPlanDate(plan.examDate)}.{' '}
          <button type="button" className="ms-plan-linkbtn" onClick={onAdjust}>
            Rebuild it for the new date
          </button>
          .
        </p>
      ) : null}

      {error ? <ErrorBox message={error} /> : null}
      {syncNote ? (
        <p className="ms-rm-sync mb-4" role="status">
          {syncNote}
        </p>
      ) : null}

      <SegmentedControl<Tab>
        value={tab}
        onChange={chooseTab}
        aria-label="Today or the whole roadmap"
        className="ms-plan-segments ms-rm-tabs mb-5"
        optionClassName="ms-plan-segment"
        options={[
          { value: 'today', label: 'Today' },
          { value: 'roadmap', label: 'Roadmap' },
        ]}
      />

      {tab === 'today' ? (
        today && hero && copy ? (
          <>
            <section className={`ms-insight-hero ms-rm-hero ms-rm-hero--${hero.kind}`} aria-labelledby={titleId}>
              <p className="ec-eyebrow mb-1">{copy.eyebrow}</p>
              <h2 id={titleId} className="ms-rm-hero__title">
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
              {status === 'adjusted' ? (
                <p className="ms-rm-hero__adjusted" role="status">
                  {lastDiff?.summary ?? DEFAULT_ADJUSTED_LINE}
                  {lastDiff ? (
                    <>
                      {' '}
                      <button type="button" className="ms-plan-linkbtn" onClick={() => setReplan({ mode: 'diff', diff: lastDiff })}>
                        See what changed
                      </button>
                    </>
                  ) : null}
                </p>
              ) : null}
              {heroTask ? (
                <div className="ms-rm-actions ms-rm-hero__actions">
                  {heroTask.href ? (
                    <LoadingLink
                      href={heroTask.href}
                      variant="button"
                      loadingText="Opening…"
                      className="ec-btn-primary ms-rm-btn ms-rm-btn--primary"
                      onNavigate={() => start(heroTask)}
                    >
                      Start focus block
                    </LoadingLink>
                  ) : (
                    <button type="button" className="ec-btn-primary ms-rm-btn ms-rm-btn--primary" disabled={busyId === heroTask.id} onClick={() => complete(heroTask)}>
                      Done
                    </button>
                  )}
                  <button type="button" className="ms-rm-btn" onClick={() => openWhySheet(heroTask)}>
                    Why this now?
                  </button>
                  <button type="button" className="ms-rm-btn ms-rm-btn--quiet" onClick={() => setReplan({ mode: 'confirm', diff: null })}>
                    Adjust today
                  </button>
                </div>
              ) : null}
              {copy.note ? <p className="ms-plan-tomorrow">{copy.note}</p> : null}
            </section>

            {workTasks(today).length > 0 || today.commitments.length > 0 ? (
              <DayTimeline
                day={today}
                state={taskState}
                evidence={evidence}
                todayIso={todayIso}
                onOpen={setDetail}
                onDone={complete}
                busyId={busyId}
              />
            ) : null}
          </>
        ) : (
          <p className="ms-plan-note">
            {examPassed ? 'Nothing is scheduled. Well done for getting here.' : 'Nothing is scheduled for today.'}
          </p>
        )
      ) : (
        <RoadmapTimeline
          plan={plan}
          state={taskState}
          evidence={evidence}
          done={done}
          todayIso={todayIso}
          onAdjust={onAdjust}
          onOpen={setDetail}
          onDone={complete}
          busyId={busyId}
        />
      )}

      <TaskDetailSheet
        task={detail}
        standing={detailStanding}
        entry={detail ? taskState[detail.id] : undefined}
        minutes={detail ? taskMinutes(detail, taskState) : 0}
        open={Boolean(detail)}
        busy={Boolean(detail && busyId === detail.id)}
        onClose={() => setDetail(null)}
        onStart={start}
        onWhy={openWhySheet}
        onAction={(task, action, extra) => {
          if (action === 'complete') {
            complete(task)
            return
          }
          setDetail(null)
          void act(task, action, extra)
        }}
      />
      <WhyThisSheet task={why} open={Boolean(why)} onClose={() => setWhy(null)} />
      <TaskCheckinSheet
        task={checkin}
        feels={checkin ? availableFeels(plan, checkin, taskState, evidence, todayIso) : undefined}
        open={Boolean(checkin)}
        busy={Boolean(checkin && busyId === checkin.id)}
        syncNote={syncNote}
        askRatings={askRatings}
        onClose={closeCheckin}
        onFeel={onFeel}
        onRating={onRating}
      />
      <ReplanSheet
        open={Boolean(replan)}
        mode={replan?.mode ?? 'confirm'}
        diff={replan?.diff ?? null}
        busy={busyId === 'replan' || busyId === 'undo'}
        canUndo={canUndo}
        syncNote={syncNote}
        onClose={() => setReplan(null)}
        onConfirm={confirmReplan}
        onUndo={undo}
      />
      <ResetSheet open={resetOpen} onClose={() => setResetOpen(false)} onRebuild={onAdjust} />
    </div>
  )
}

function ResetSheet({ open, onClose, onRebuild }: { open: boolean; onClose: () => void; onRebuild: () => void }) {
  const id = useId()
  return (
    <Sheet open={open} onClose={onClose} labelledById={id}>
      <div className="ms-rm-sheet">
        <p className="ec-eyebrow mb-1">Let&apos;s reset</p>
        <h2 id={id} className="ms-rm-sheet__title">
          A few days went by. Want a fresh plan from today? Your ticks stay.
        </h2>
        <div className="ms-rm-actions">
          <button type="button" className="ec-btn-primary ms-rm-btn ms-rm-btn--primary" onClick={onRebuild}>
            Rebuild from today
          </button>
          <button type="button" className="ms-rm-btn ms-rm-btn--quiet" onClick={onClose}>
            Keep this plan
          </button>
        </div>
      </div>
    </Sheet>
  )
}
