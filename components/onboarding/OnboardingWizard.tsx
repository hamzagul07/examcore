'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, BookOpen, LineChart, Loader2, PenLine } from 'lucide-react'
import { AuthShell } from '@/components/AuthShell'
import { ErrorBox } from '@/components/AuthFormBits'
import { CelebrationModal } from '@/components/ui/CelebrationModal'
import {
  SUBJECT_GROUPS,
  DEFAULT_BOARD,
  DEFAULT_LEVEL,
  LEVELS,
  isSubjectValidForLevel,
  subjectsInGroup,
} from '@/lib/profile-options'
import type { PrimaryGoal, UserStage } from '@/lib/database.types'
import { sanitizeNextPath } from '@/lib/auth-redirect'
import { suggestedExamDates } from '@/lib/dashboard/exam-date'

const TOTAL_STEPS = 5

const STAGE_OPTIONS: { id: UserStage; title: string; subtitle: string }[] = [
  { id: 'as_level', title: 'AS Level', subtitle: 'Year 12' },
  { id: 'a2_level', title: 'A2 Level', subtitle: 'Year 13' },
  { id: 'other', title: 'Just exploring', subtitle: 'Other / not sure yet' },
]

const GOAL_OPTIONS: {
  id: PrimaryGoal
  title: string
  subtitle: string
  icon: typeof BookOpen
}[] = [
  {
    id: 'mark_papers',
    title: 'Mark practice papers',
    subtitle: 'Most students start here',
    icon: BookOpen,
  },
  {
    id: 'track_progress',
    title: 'Track my progress per topic',
    subtitle: 'Mastery matrix & grade trajectory',
    icon: LineChart,
  },
  {
    id: 'essay_feedback',
    title: 'Get feedback on essays',
    subtitle: 'History, Law, Sociology & more',
    icon: PenLine,
  },
]

export function OnboardingWizard({
  rerun = false,
  initialProfile = null,
}: {
  rerun?: boolean
  initialProfile?: {
    subjects: string[]
    stage: UserStage | null
    primary_goal: PrimaryGoal | null
    exam_date: string | null
  } | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')

  const [step, setStep] = useState(rerun ? 2 : 1)
  const [level, setLevel] = useState(DEFAULT_LEVEL)
  const [subjects, setSubjects] = useState<string[]>(initialProfile?.subjects ?? [])
  const [stage, setStage] = useState<UserStage | null>(initialProfile?.stage ?? null)
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(
    initialProfile?.primary_goal ?? null
  )
  const [examDate, setExamDate] = useState<string | null>(initialProfile?.exam_date ?? null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const [pendingHref, setPendingHref] = useState('/mark')

  function toggleSubject(id: string) {
    setSubjects((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id)
      if (prev.length >= 4) return prev
      return [...prev, id]
    })
    setErrorMsg('')
  }

  function handleLevelChange(nextLevel: string) {
    setLevel(nextLevel)
    setSubjects((prev) => prev.filter((id) => isSubjectValidForLevel(id, nextLevel)))
    if (nextLevel === 'O-Level') {
      setStage('other')
    }
    setErrorMsg('')
  }

  async function completeOnboarding(redirectHref: string) {
    if (!stage || !primaryGoal || subjects.length === 0) return

    setLoading(true)
    setErrorMsg('')

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board: DEFAULT_BOARD,
        level,
        subjects,
        stage,
        primary_goal: primaryGoal,
        exam_date: examDate,
        role: 'student',
      }),
    })

    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data?.error || 'Could not save your profile. Try again.')
      return
    }

    setPendingHref(redirectHref)
    if (rerun) {
      router.push(redirectHref)
      router.refresh()
      return
    }
    setShowCelebration(true)
  }

  function finishCelebration() {
    setShowCelebration(false)
    router.push(pendingHref)
    router.refresh()
  }

  function goNext() {
    setErrorMsg('')
    if (step === 2 && subjects.length === 0) {
      setErrorMsg('Pick at least one subject to continue.')
      return
    }
    if (step === 3 && !stage) {
      setErrorMsg('Pick where you are in your studies.')
      return
    }
    if (step === 4 && !primaryGoal) {
      setErrorMsg('Pick what you want to focus on.')
      return
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function goBack() {
    setErrorMsg('')
    setStep((s) => Math.max(s - 1, 1))
  }

  const markHref = sanitizeNextPath(nextParam, rerun ? '/account/study' : '/mark')
  const backHref = rerun ? sanitizeNextPath(nextParam, '/account/study') : '/auth/signout'
  const backLabel = rerun ? 'Back to settings' : 'Sign out'

  return (
    <>
      <AuthShell showBetaBadge={false} backLabel={backLabel} backHref={backHref}>
        <ProgressSteps current={step} total={TOTAL_STEPS} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && (
              <StepWelcome onContinue={goNext} />
            )}
            {step === 2 && (
              <StepSubjects
                level={level}
                onLevelChange={handleLevelChange}
                selected={subjects}
                onToggle={toggleSubject}
                errorMsg={errorMsg}
                onContinue={goNext}
                onBack={goBack}
              />
            )}
            {step === 3 && (
              <StepStage
                level={level}
                selected={stage}
                onSelect={setStage}
                examDate={examDate}
                onExamDateChange={setExamDate}
                errorMsg={errorMsg}
                onContinue={goNext}
                onBack={goBack}
              />
            )}
            {step === 4 && (
              <StepGoal
                selected={primaryGoal}
                onSelect={setPrimaryGoal}
                errorMsg={errorMsg}
                onContinue={goNext}
                onBack={goBack}
              />
            )}
            {step === 5 && (
              <StepFirstMark
                loading={loading}
                errorMsg={errorMsg}
                onBack={goBack}
                onMark={() => completeOnboarding(rerun ? markHref : markHref)}
                onDashboard={() =>
                  completeOnboarding(rerun ? markHref : '/dashboard')
                }
                rerun={rerun}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </AuthShell>

      <CelebrationModal
        open={showCelebration}
        title="You're all set!"
        message="Your profile is ready. Time to see what examiner-style feedback looks like."
        onDismiss={finishCelebration}
      />
    </>
  )
}

function ProgressSteps({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-8">
      <p className="ec-label-tech mb-3">
        Step {current} of {total}
      </p>
      <div className="flex gap-2">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors duration-300"
            style={{
              background:
                i + 1 <= current
                  ? 'var(--ec-brand)'
                  : 'color-mix(in srgb, var(--ec-border) 80%, transparent)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function StepWelcome({ onContinue }: { onContinue: () => void }) {
  return (
    <div>
      <div className="mb-8 flex justify-center">
        <div className="relative h-32 w-32">
          <div
            className="absolute inset-0 rounded-full blur-2xl"
            style={{ background: 'color-mix(in srgb, var(--ec-brand) 25%, transparent)' }}
          />
          <div
            className="relative flex h-full w-full items-center justify-center rounded-3xl border"
            style={{
              borderColor: 'color-mix(in srgb, var(--ec-brand) 35%, transparent)',
              background: 'var(--ec-surface-raised)',
            }}
          >
            <div className="grid grid-cols-2 gap-2 p-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-lg"
                  style={{
                    background: `color-mix(in srgb, var(--ec-brand) ${20 + i * 12}%, transparent)`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <h1 className="text-headline text-[var(--ec-text-primary)]">
        Welcome to <span className="ec-text-gradient">Examcore</span>
      </h1>
      <p className="text-body mt-4 text-[var(--ec-text-secondary)]">
        Let&apos;s set up your account so we can mark your work the way you need
        — real Cambridge schemes, honest feedback, about a minute per question.
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="ec-btn-primary mt-8 w-full justify-center"
      >
        Let&apos;s go <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function StepSubjects({
  level,
  onLevelChange,
  selected,
  onToggle,
  errorMsg,
  onContinue,
  onBack,
}: {
  level: string
  onLevelChange: (level: string) => void
  selected: string[]
  onToggle: (id: string) => void
  errorMsg: string
  onContinue: () => void
  onBack: () => void
}) {
  const levelHeading =
    level === 'O-Level'
      ? 'O-Levels'
      : level === 'IGCSE'
        ? 'IGCSE subjects'
        : level === 'AS Level'
          ? 'AS Levels'
          : 'A-Levels'

  return (
    <div>
      <h1 className="text-headline text-[var(--ec-text-primary)]">
        What level are you studying?
      </h1>
      <p className="text-body mt-3 text-[var(--ec-text-secondary)]">
        Pick your Cambridge level, then choose up to four subjects.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {LEVELS.filter((l) => l.enabled).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onLevelChange(opt.id)}
            className={`min-h-[44px] rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
              level === opt.id
                ? 'border-emerald-500/50 bg-emerald-500/10 text-[var(--ec-text-primary)]'
                : 'border-[var(--ec-border)] bg-[var(--ec-surface-raised)] text-[var(--ec-text-secondary)] hover:border-emerald-500/30'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <h2 className="text-title mt-8 text-[var(--ec-text-primary)]">
        Which Cambridge {levelHeading} are you taking?
      </h2>
      <p className="text-body mt-2 text-[var(--ec-text-secondary)]">
        We&apos;ll tailor papers and progress to these subjects.
      </p>
      <div className="mt-6 space-y-6 sm:max-h-[min(40vh,360px)] sm:space-y-6 sm:overflow-y-auto sm:pr-1">
        {SUBJECT_GROUPS.map((group) => {
          const items = subjectsInGroup(group, level)
          if (!items.length) return null
          return (
            <div key={group}>
              <p className="ec-label-tech mb-2">{group}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {items.map((subject) => {
                  const active = selected.includes(subject.id)
                  return (
                    <button
                      key={subject.code}
                      type="button"
                      onClick={() => onToggle(subject.id)}
                      className={`min-h-[48px] rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                        active
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-[var(--ec-text-primary)]'
                          : 'border-[var(--ec-border)] bg-[var(--ec-surface-raised)] text-[var(--ec-text-secondary)] hover:border-emerald-500/30'
                      }`}
                    >
                      {subject.label}
                      <span className="ml-2 font-mono text-xs opacity-60">
                        {subject.code}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      {errorMsg && <div className="mt-4"><ErrorBox message={errorMsg} /></div>}
      <StepNav onBack={onBack} onContinue={onContinue} continueLabel="Continue" />
    </div>
  )
}

function StepStage({
  level,
  selected,
  onSelect,
  examDate,
  onExamDateChange,
  errorMsg,
  onContinue,
  onBack,
}: {
  level: string
  selected: UserStage | null
  onSelect: (s: UserStage) => void
  examDate: string | null
  onExamDateChange: (d: string | null) => void
  errorMsg: string
  onContinue: () => void
  onBack: () => void
}) {
  const suggestions = suggestedExamDates()
  const stageOptions =
    level === 'O-Level' || level === 'IGCSE'
      ? STAGE_OPTIONS.filter((opt) => opt.id === 'other')
      : STAGE_OPTIONS

  return (
    <div>
      <h1 className="text-headline text-[var(--ec-text-primary)]">
        Where are you in your studies?
      </h1>
      <p className="text-body mt-3 text-[var(--ec-text-secondary)]">
        {level === 'O-Level'
          ? 'This helps us tailor papers and feedback for your O-Level year.'
          : 'This helps us pitch feedback at the right level.'}
      </p>
      <div className="mt-6 space-y-3">
        {stageOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={`ec-card w-full p-5 text-left transition-all min-h-[44px] ${
              selected === opt.id ? 'border-emerald-500/40 ring-1 ring-emerald-500/30' : ''
            }`}
          >
            <p className="font-bold text-[var(--ec-text-primary)]">{opt.title}</p>
            <p className="text-caption mt-1 text-[var(--ec-text-secondary)]">
              {opt.subtitle}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-8 border-t border-[var(--ec-border)] pt-6">
        <h2 className="text-title">When&apos;s your exam?</h2>
        <p className="text-caption mt-1">Optional — we&apos;ll show a countdown on your home page.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onExamDateChange(s.value)}
              className={`min-h-[44px] rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                examDate === s.value
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-[var(--ec-text-primary)]'
                  : 'border-[var(--ec-border)] text-[var(--ec-text-secondary)] hover:border-emerald-500/30'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <label className="mt-4 block">
          <span className="text-caption mb-1.5 block">Or pick a specific date</span>
          <input
            type="date"
            value={examDate ?? ''}
            onChange={(e) => onExamDateChange(e.target.value || null)}
            className="ec-input"
          />
        </label>
        <button
          type="button"
          onClick={() => onExamDateChange(null)}
          className="ec-btn-ghost mt-3 text-sm"
        >
          I&apos;ll set this later
        </button>
      </div>

      {errorMsg && <div className="mt-4"><ErrorBox message={errorMsg} /></div>}
      <StepNav onBack={onBack} onContinue={onContinue} continueLabel="Continue" />
    </div>
  )
}

function StepGoal({
  selected,
  onSelect,
  errorMsg,
  onContinue,
  onBack,
}: {
  selected: PrimaryGoal | null
  onSelect: (g: PrimaryGoal) => void
  errorMsg: string
  onContinue: () => void
  onBack: () => void
}) {
  return (
    <div>
      <h1 className="text-headline text-[var(--ec-text-primary)]">
        What&apos;s your main goal?
      </h1>
      <p className="text-body mt-3 text-[var(--ec-text-secondary)]">
        We&apos;ll prioritize the right parts of your dashboard.
      </p>
      <div className="mt-6 space-y-3">
        {GOAL_OPTIONS.map((opt) => {
          const Icon = opt.icon
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`ec-card flex w-full items-start gap-4 p-5 text-left transition-all ${
                selected === opt.id ? 'border-emerald-500/40 ring-1 ring-emerald-500/30' : ''
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                <Icon className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-[var(--ec-text-primary)]">{opt.title}</p>
                <p className="text-caption mt-1 text-[var(--ec-text-secondary)]">
                  {opt.subtitle}
                </p>
              </div>
            </button>
          )
        })}
      </div>
      {errorMsg && <div className="mt-4"><ErrorBox message={errorMsg} /></div>}
      <StepNav onBack={onBack} onContinue={onContinue} continueLabel="Continue" />
    </div>
  )
}

function StepFirstMark({
  loading,
  errorMsg,
  onBack,
  onMark,
  onDashboard,
  rerun = false,
}: {
  loading: boolean
  errorMsg: string
  onBack: () => void
  onMark: () => void
  onDashboard: () => void
  rerun?: boolean
}) {
  return (
    <div>
      <h1 className="text-headline text-[var(--ec-text-primary)]">
        {rerun
          ? 'Save your updated profile'
          : "You're all set. Let's mark your first question."}
      </h1>
      <p className="text-body mt-4 text-[var(--ec-text-secondary)]">
        {rerun
          ? 'Review your choices, then save to update your dashboard and paper recommendations.'
          : "Upload something you've already done. We'll mark it and show you what an examiner-style review looks like — usually under a minute."}
      </p>
      {errorMsg && <div className="mt-4"><ErrorBox message={errorMsg} /></div>}
      <div className="mt-8 space-y-3">
        <button
          type="button"
          disabled={loading}
          aria-busy={loading || undefined}
          data-loading={loading ? 'true' : undefined}
          onClick={onMark}
          className="ec-btn-primary w-full justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Saving profile...
            </>
          ) : rerun ? (
            <>Save and return to settings</>
          ) : (
            <>Mark a question now <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
        {!rerun && (
          <button
            type="button"
            disabled={loading}
            onClick={onDashboard}
            className="ec-btn-secondary w-full justify-center"
          >
            Explore the dashboard first
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onBack}
        disabled={loading}
        className="ec-btn-ghost mt-4 w-full justify-center"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
    </div>
  )
}

function StepNav({
  onBack,
  onContinue,
  continueLabel,
}: {
  onBack: () => void
  onContinue: () => void
  continueLabel: string
}) {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <button type="button" onClick={onBack} className="ec-btn-ghost flex-1 justify-center">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <button type="button" onClick={onContinue} className="ec-btn-primary flex-1 justify-center">
        {continueLabel} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}
