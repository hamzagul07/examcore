'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, BookOpen, LineChart, PenLine } from 'lucide-react'
import { AuthShell } from '@/components/AuthShell'
import { ErrorBox } from '@/components/AuthFormBits'
import { CelebrationModal } from '@/components/ui/CelebrationModal'
import {
  SUBJECTS,
  SUBJECT_GROUPS,
  DEFAULT_BOARD,
} from '@/lib/profile-options'
import type { PrimaryGoal, UserStage } from '@/lib/database.types'
import { sanitizeNextPath } from '@/lib/auth-redirect'

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

export function OnboardingWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')

  const [step, setStep] = useState(1)
  const [subjects, setSubjects] = useState<string[]>([])
  const [stage, setStage] = useState<UserStage | null>(null)
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null)
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

  async function completeOnboarding(redirectHref: string) {
    if (!stage || !primaryGoal || subjects.length === 0) return

    setLoading(true)
    setErrorMsg('')

    const level =
      stage === 'as_level' ? 'AS Level' : stage === 'a2_level' ? 'A-Level' : 'A-Level'

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board: DEFAULT_BOARD,
        level,
        subjects,
        stage,
        primary_goal: primaryGoal,
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

  const markHref = sanitizeNextPath(nextParam, '/mark')

  return (
    <>
      <AuthShell showBetaBadge={false} backLabel="Sign out" backHref="/auth/signout">
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
                selected={subjects}
                onToggle={toggleSubject}
                errorMsg={errorMsg}
                onContinue={goNext}
                onBack={goBack}
              />
            )}
            {step === 3 && (
              <StepStage
                selected={stage}
                onSelect={setStage}
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
                onMark={() => completeOnboarding(markHref)}
                onDashboard={() => completeOnboarding('/dashboard')}
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
  selected,
  onToggle,
  errorMsg,
  onContinue,
  onBack,
}: {
  selected: string[]
  onToggle: (id: string) => void
  errorMsg: string
  onContinue: () => void
  onBack: () => void
}) {
  return (
    <div>
      <h1 className="text-headline text-[var(--ec-text-primary)]">
        Which Cambridge A-Levels are you taking?
      </h1>
      <p className="text-body mt-3 text-[var(--ec-text-secondary)]">
        Pick up to four. We&apos;ll tailor papers and progress to these subjects.
      </p>
      <div className="mt-6 max-h-[min(50vh,420px)] space-y-6 overflow-y-auto pr-1">
        {SUBJECT_GROUPS.map((group) => {
          const items = SUBJECTS.filter((s) => s.enabled && s.group === group)
          if (!items.length) return null
          return (
            <div key={group}>
              <p className="ec-label-tech mb-2">{group}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {items.map((subject) => {
                  const active = selected.includes(subject.id)
                  return (
                    <button
                      key={subject.id}
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
  selected,
  onSelect,
  errorMsg,
  onContinue,
  onBack,
}: {
  selected: UserStage | null
  onSelect: (s: UserStage) => void
  errorMsg: string
  onContinue: () => void
  onBack: () => void
}) {
  return (
    <div>
      <h1 className="text-headline text-[var(--ec-text-primary)]">
        Where are you in your studies?
      </h1>
      <p className="text-body mt-3 text-[var(--ec-text-secondary)]">
        This helps us pitch feedback at the right level.
      </p>
      <div className="mt-6 space-y-3">
        {STAGE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={`ec-card w-full p-5 text-left transition-all ${
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
}: {
  loading: boolean
  errorMsg: string
  onBack: () => void
  onMark: () => void
  onDashboard: () => void
}) {
  return (
    <div>
      <h1 className="text-headline text-[var(--ec-text-primary)]">
        You&apos;re all set. Let&apos;s mark your first question.
      </h1>
      <p className="text-body mt-4 text-[var(--ec-text-secondary)]">
        Upload something you&apos;ve already done. We&apos;ll mark it and show you
        what an examiner-style review looks like — usually under a minute.
      </p>
      {errorMsg && <div className="mt-4"><ErrorBox message={errorMsg} /></div>}
      <div className="mt-8 space-y-3">
        <button
          type="button"
          disabled={loading}
          onClick={onMark}
          className="ec-btn-primary w-full justify-center"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Saving profile...
            </span>
          ) : (
            <>Mark a question now <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onDashboard}
          className="ec-btn-secondary w-full justify-center"
        >
          Explore the dashboard first
        </button>
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
