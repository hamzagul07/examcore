'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { ErrorBox } from '@/components/AuthFormBits'
import { InlineSavingPulse } from '@/components/ui/ButtonLoadingState'
import { suggestedExamDates } from '@/lib/dashboard/exam-date'
import { ProfileFormFields } from '@/components/ProfileFormFields'
import { IB_DIPLOMA_LEVEL, isIbBoard } from '@/lib/profile-options'
import {
  targetGradeKindFromBoard,
  targetGradeOptions,
} from '@/lib/target-grade'
import type { PrimaryGoal, UserStage } from '@/lib/database.types'
import {
  SettingsFieldGroup,
  SettingsSectionCard,
} from '@/components/settings/SettingsSectionCard'
import { SavedStamp, useSavedStamp } from '@/components/settings/SettingsShell'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { cn } from '@/lib/utils'

type Props = {
  initialProfile: {
    full_name: string
    board: string
    level: string
    subjects: string[]
    exam_date: string
    target_grade: string
    stage: UserStage | null
    primary_goal: PrimaryGoal | null
  }
}

type SavePayload = Record<string, unknown>

const STAGE_OPTIONS: { id: UserStage; label: string; ibLabel: string }[] = [
  { id: 'as_level', label: 'AS Level (Year 12)', ibLabel: 'DP Year 1' },
  { id: 'a2_level', label: 'A2 Level (Year 13)', ibLabel: 'DP Year 2' },
  { id: 'other', label: 'Just exploring', ibLabel: 'Just exploring' },
]

const GOAL_OPTIONS: { id: PrimaryGoal; label: string }[] = [
  { id: 'mark_papers', label: 'Mark practice papers' },
  { id: 'track_progress', label: 'Track progress per topic' },
  { id: 'essay_feedback', label: 'Get feedback on essays' },
]

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const target = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

/** Persistent polite live region — the visual stamp is decorative. */
function SrStatus({ message }: { message: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {message}
    </span>
  )
}

export function ExamSection({ initialProfile }: Props) {
  const router = useRouter()

  // Board / level / subjects are shared state: every save posts the current
  // setup so the API's board+level+subject validation always sees a full,
  // consistent profile.
  const [board, setBoard] = useState(initialProfile.board)
  const [level, setLevel] = useState(() =>
    isIbBoard(initialProfile.board) ? IB_DIPLOMA_LEVEL : initialProfile.level
  )
  const [subjects, setSubjects] = useState<string[]>(initialProfile.subjects)

  async function post(payload: SavePayload): Promise<string | null> {
    const res = await fetch('/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board, level, subjects, ...payload }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return data?.error || 'Could not save your changes. Try again.'
    }
    return null
  }

  return (
    <div className="space-y-6">
      <SetupCard
        board={board}
        setBoard={setBoard}
        level={level}
        setLevel={setLevel}
        subjects={subjects}
        setSubjects={setSubjects}
        fullName={initialProfile.full_name}
        post={post}
        onSaved={() => router.refresh()}
      />
      <StageGoalCard
        board={board}
        initialStage={initialProfile.stage}
        initialGoal={initialProfile.primary_goal}
        post={post}
      />
      <TargetGradeCard
        board={board}
        initialTarget={initialProfile.target_grade}
        post={post}
      />
      <ExamDateCard initialDate={initialProfile.exam_date} post={post} />
    </div>
  )
}

function SetupCard({
  board,
  setBoard,
  level,
  setLevel,
  subjects,
  setSubjects,
  fullName,
  post,
  onSaved,
}: {
  board: string
  setBoard: (s: string) => void
  level: string
  setLevel: (s: string) => void
  subjects: string[]
  setSubjects: (s: string[]) => void
  fullName: string
  post: (payload: SavePayload) => Promise<string | null>
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const { stamp, showSaved, clearSaved } = useSavedStamp()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    clearSaved()
    const error = await post({})
    setLoading(false)
    if (error) {
      setErrorMsg(error)
      return
    }
    setSuccessMsg('Exam setup saved.')
    showSaved()
    onSaved()
  }

  return (
    <SettingsSectionCard
      title="Exam setup"
      description="Your board, level, and subjects — this shapes the papers, courses, and progress we surface everywhere."
    >
      <form onSubmit={handleSave} className="space-y-6">
        <ProfileFormFields
          fullName={fullName}
          setFullName={() => {}}
          board={board}
          setBoard={setBoard}
          level={level}
          setLevel={setLevel}
          subjects={subjects}
          setSubjects={setSubjects}
          showFullName={false}
        />

        {errorMsg && <ErrorBox message={errorMsg} />}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={loading}
            loadingText="Saving..."
            disabled={subjects.length === 0}
          >
            Save exam setup
          </Button>
          <SavedStamp state={stamp} label={<>✓ {successMsg || 'Saved'}</>} />
        </div>
        <SrStatus message={successMsg} />
      </form>
    </SettingsSectionCard>
  )
}

function StageGoalCard({
  board,
  initialStage,
  initialGoal,
  post,
}: {
  board: string
  initialStage: UserStage | null
  initialGoal: PrimaryGoal | null
  post: (payload: SavePayload) => Promise<string | null>
}) {
  const [stage, setStage] = useState<UserStage | null>(initialStage)
  const [goal, setGoal] = useState<PrimaryGoal | null>(initialGoal)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const { stamp, showSaved, clearSaved } = useSavedStamp()
  const ib = isIbBoard(board)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    clearSaved()
    const error = await post({ stage, primary_goal: goal })
    setLoading(false)
    if (error) {
      setErrorMsg(error)
      return
    }
    setSuccessMsg('Stage and goal saved.')
    showSaved()
  }

  return (
    <SettingsSectionCard
      title="Stage & goal"
      description="Where you are in the course and what you want out of MarkScheme — tunes dashboard suggestions."
    >
      <form onSubmit={handleSave} className="space-y-6">
        <SettingsFieldGroup label="Study stage">
          <SegmentedControl
            className="flex flex-wrap gap-2"
            optionClassName="ec-pill"
            aria-label="Study stage"
            value={stage}
            disabled={loading}
            onChange={(id) => setStage(stage === id ? null : id)}
            options={STAGE_OPTIONS.map((s) => ({
              value: s.id,
              label: ib ? s.ibLabel : s.label,
            }))}
          />
        </SettingsFieldGroup>

        <SettingsFieldGroup label="Primary goal">
          <SegmentedControl
            className="flex flex-wrap gap-2"
            optionClassName="ec-pill"
            aria-label="Primary goal"
            value={goal}
            disabled={loading}
            onChange={(id) => setGoal(goal === id ? null : id)}
            options={GOAL_OPTIONS.map((g) => ({
              value: g.id,
              label: g.label,
            }))}
          />
        </SettingsFieldGroup>

        {errorMsg && <ErrorBox message={errorMsg} />}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={loading}
            loadingText="Saving..."
          >
            Save stage & goal
          </Button>
          <SavedStamp state={stamp} label={<>✓ {successMsg || 'Saved'}</>} />
        </div>
        <SrStatus message={successMsg} />
      </form>
    </SettingsSectionCard>
  )
}

function TargetGradeCard({
  board,
  initialTarget,
  post,
}: {
  board: string
  initialTarget: string
  post: (payload: SavePayload) => Promise<string | null>
}) {
  const [targetGrade, setTargetGrade] = useState(initialTarget)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const { stamp, showSaved, clearSaved } = useSavedStamp()
  const options = targetGradeOptions(targetGradeKindFromBoard(board))

  async function save(next: string) {
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    clearSaved()
    const error = await post({ target_grade: next || null })
    setLoading(false)
    if (error) {
      setErrorMsg(error)
      return
    }
    setSuccessMsg(next ? `Target grade set to ${next}.` : 'Target grade cleared.')
    showSaved()
  }

  return (
    <SettingsSectionCard
      title="Target grade"
      description="The grade you're aiming for. Powers your on-track trajectory on the progress dashboard."
    >
      <SettingsFieldGroup label="Target grade">
        {/* The picker saves on tap, so its feedback sits on the same row:
            a pulse while the request is out, the stamp once it lands. */}
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            className="ms-ob-stamp-pick flex flex-wrap gap-2"
            optionClassName="ms-ob-stamp-pick__btn min-h-[44px]!"
            aria-label="Target grade"
            value={targetGrade || null}
            disabled={loading}
            onChange={(g) => {
              const next = targetGrade === g ? '' : g
              setTargetGrade(next)
              void save(next)
            }}
            options={options.map((g) => ({ value: g, label: g }))}
          />
          <span className="inline-flex min-h-[22px] items-center" aria-hidden>
            {loading && <InlineSavingPulse />}
            <SavedStamp state={stamp} label={<>✓ {successMsg || 'Saved'}</>} />
          </span>
        </div>
        {errorMsg && (
          <div className="mt-4">
            <ErrorBox message={errorMsg} />
          </div>
        )}
        <SrStatus message={successMsg} />
      </SettingsFieldGroup>
    </SettingsSectionCard>
  )
}

function ExamDateCard({
  initialDate,
  post,
}: {
  initialDate: string
  post: (payload: SavePayload) => Promise<string | null>
}) {
  const [examDate, setExamDate] = useState(initialDate)
  // Which button is out on the wire, so only that one shows loading and the
  // other simply waits.
  const [pending, setPending] = useState<'save' | 'clear' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const { stamp, showSaved, clearSaved } = useSavedStamp()
  const suggestions = suggestedExamDates()
  const days = daysUntil(examDate)
  const loading = pending !== null

  async function save(nextDate: string | null) {
    setPending(nextDate ? 'save' : 'clear')
    setErrorMsg('')
    setSuccessMsg('')
    clearSaved()
    const error = await post({ exam_date: nextDate })
    setPending(null)
    if (error) {
      setErrorMsg(error)
      return
    }
    setExamDate(nextDate ?? '')
    setSuccessMsg(nextDate ? 'Exam date saved.' : 'Exam date cleared.')
    showSaved()
  }

  return (
    <SettingsSectionCard
      title="Exam date"
      description="Powers the live countdown on your dashboard home page."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void save(examDate || null)
        }}
        className="space-y-6"
      >
        <div className="ms-exam-pills flex flex-wrap gap-2" role="group" aria-label="Suggested exam sessions">
          {suggestions.map((s) => {
            const on = examDate === s.value
            return (
              <button
                key={s.value}
                type="button"
                disabled={loading}
                aria-pressed={on}
                onClick={() => setExamDate(s.value)}
                className={cn(
                  'ec-pill',
                  on &&
                    'border-[color-mix(in_srgb,var(--ec-brand)_50%,transparent)] bg-[var(--ec-brand-muted)] text-[var(--ec-brand)]'
                )}
              >
                {s.label}
              </button>
            )
          })}
        </div>

        <Field
          label="Specific date"
          labelClassName="label-overline mb-2 block"
          inputProps={{
            id: 'examDate',
            type: 'date',
            value: examDate,
            onChange: (e) => setExamDate(e.target.value),
          }}
        />

        {days !== null && (
          <p className="inline-flex items-center gap-2 rounded border border-[color-mix(in_srgb,var(--ec-brand)_35%,transparent)] bg-[var(--ec-brand-muted)] px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wide text-[var(--ec-brand)] tabular-nums">
            <span className="font-mono text-[10px] font-bold tracking-wide" aria-hidden>T</span>
            {days > 1
              ? `${days} days to go`
              : days === 1
                ? 'Tomorrow!'
                : days === 0
                  ? 'Exam day is today'
                  : `${Math.abs(days)} days ago — set your next session?`}
          </p>
        )}

        {days !== null && days > 0 && (
          <p className="text-sm">
            <Link href="/dashboard/plan" className="font-medium text-[var(--ec-brand)] underline underline-offset-4">
              Build a day-by-day plan to it →
            </Link>
          </p>
        )}

        {errorMsg && <ErrorBox message={errorMsg} />}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={pending === 'save'}
            loadingText="Saving..."
            disabled={loading}
          >
            Save exam date
          </Button>
          {examDate && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              isLoading={pending === 'clear'}
              loadingText="Clearing..."
              disabled={loading}
              onClick={() => void save(null)}
            >
              Clear date
            </Button>
          )}
          <SavedStamp state={stamp} label={<>✓ {successMsg || 'Saved'}</>} />
        </div>
        <SrStatus message={successMsg} />
      </form>
    </SettingsSectionCard>
  )
}
