'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ErrorBox, SuccessBox } from '@/components/AuthFormBits'
import { suggestedExamDates } from '@/lib/dashboard/exam-date'
import { ProfileFormFields } from '@/components/ProfileFormFields'
import { IB_DIPLOMA_LEVEL, isIbBoard } from '@/lib/profile-options'
import type { PrimaryGoal, UserStage } from '@/lib/database.types'
import {
  SettingsFieldGroup,
  SettingsSectionCard,
} from '@/components/settings/SettingsSectionCard'

type Props = {
  initialProfile: {
    full_name: string
    board: string
    level: string
    subjects: string[]
    exam_date: string
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    const error = await post({})
    setLoading(false)
    if (error) {
      setErrorMsg(error)
      return
    }
    setSuccessMsg('Exam setup saved.')
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
        {successMsg && <SuccessBox message={successMsg} />}

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
  const ib = isIbBoard(board)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    const error = await post({ stage, primary_goal: goal })
    setLoading(false)
    if (error) {
      setErrorMsg(error)
      return
    }
    setSuccessMsg('Stage and goal saved.')
  }

  return (
    <SettingsSectionCard
      title="Stage & goal"
      description="Where you are in the course and what you want out of MarkScheme — tunes dashboard suggestions."
    >
      <form onSubmit={handleSave} className="space-y-6">
        <SettingsFieldGroup label="Study stage">
          <div className="flex flex-wrap gap-2">
            {STAGE_OPTIONS.map((s) => {
              const active = stage === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={loading}
                  onClick={() => setStage(active ? null : s.id)}
                  aria-pressed={active}
                  className={`ec-pill ${active ? 'border-[color-mix(in_srgb,var(--ec-brand)_50%,transparent)] bg-[var(--ec-brand-muted)] text-[var(--ec-brand)]' : ''}`}
                >
                  {ib ? s.ibLabel : s.label}
                </button>
              )
            })}
          </div>
        </SettingsFieldGroup>

        <SettingsFieldGroup label="Primary goal">
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((g) => {
              const active = goal === g.id
              return (
                <button
                  key={g.id}
                  type="button"
                  disabled={loading}
                  onClick={() => setGoal(active ? null : g.id)}
                  aria-pressed={active}
                  className={`ec-pill ${active ? 'border-[color-mix(in_srgb,var(--ec-brand)_50%,transparent)] bg-[var(--ec-brand-muted)] text-[var(--ec-brand)]' : ''}`}
                >
                  {g.label}
                </button>
              )
            })}
          </div>
        </SettingsFieldGroup>

        {errorMsg && <ErrorBox message={errorMsg} />}
        {successMsg && <SuccessBox message={successMsg} />}

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={loading}
          loadingText="Saving..."
        >
          Save stage & goal
        </Button>
      </form>
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
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const suggestions = suggestedExamDates()
  const days = daysUntil(examDate)

  async function save(nextDate: string | null) {
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    const error = await post({ exam_date: nextDate })
    setLoading(false)
    if (error) {
      setErrorMsg(error)
      return
    }
    setExamDate(nextDate ?? '')
    setSuccessMsg(nextDate ? 'Exam date saved.' : 'Exam date cleared.')
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
        <div className="ms-exam-pills flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s.value}
              type="button"
              disabled={loading}
              onClick={() => setExamDate(s.value)}
              className={`ec-pill ${examDate === s.value ? 'border-[color-mix(in_srgb,var(--ec-brand)_50%,transparent)] bg-[var(--ec-brand-muted)] text-[var(--ec-brand)]' : ''}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <SettingsFieldGroup label="Specific date">
          <input
            id="examDate"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="ec-input"
          />
        </SettingsFieldGroup>

        {days !== null && (
          <p
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold"
            style={{
              borderColor: 'color-mix(in srgb, var(--ec-brand) 35%, transparent)',
              background: 'var(--ec-brand-muted)',
              color: 'var(--ec-brand)',
            }}
          >
            <CalendarClock className="h-4 w-4" aria-hidden />
            {days > 1
              ? `${days} days to go`
              : days === 1
                ? 'Tomorrow!'
                : days === 0
                  ? 'Exam day is today'
                  : `${Math.abs(days)} days ago — set your next session?`}
          </p>
        )}

        {errorMsg && <ErrorBox message={errorMsg} />}
        {successMsg && <SuccessBox message={successMsg} />}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={loading}
            loadingText="Saving..."
          >
            Save exam date
          </Button>
          {examDate && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={loading}
              onClick={() => void save(null)}
            >
              Clear date
            </Button>
          )}
        </div>
      </form>
    </SettingsSectionCard>
  )
}
